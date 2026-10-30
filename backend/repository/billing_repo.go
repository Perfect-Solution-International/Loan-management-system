package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"math"
	"time"

	"github.com/google/uuid"
	"loan-management-backend/billing"
	"loan-management-backend/database"
)

type BillingRepository struct{ db *database.DB }

func NewBillingRepository(db *database.DB) *BillingRepository { return &BillingRepository{db} }

type scanner interface{ Scan(...any) error }

const planColumns = `id,name,billing_interval,amount_minor,currency,currency_exponent,trial_duration,active,yearly_discount_percent`

func scanPlan(row scanner) (p billing.Plan, err error) {
	err = row.Scan(&p.ID, &p.Name, &p.Interval, &p.AmountMinor, &p.Currency, &p.CurrencyExponent, &p.TrialDuration, &p.Active, &p.YearlyDiscountPercent)
	return
}

const subscriptionColumns = `id,organization_id,plan_id,status,trial_start,trial_end,current_period_start,current_period_end,cancel_at_period_end,canceled_at`

func scanSubscription(row scanner) (s billing.Subscription, err error) {
	err = row.Scan(&s.ID, &s.OrganizationID, &s.PlanID, &s.Status, &s.TrialStart, &s.TrialEnd, &s.PeriodStart, &s.PeriodEnd, &s.CancelAtPeriodEnd, &s.CanceledAt)
	return
}

const paymentColumns = `id,organization_id,subscription_id,plan_id,amount_minor,currency,currency_exponent,billing_interval,provider,provider_session_id,provider_transaction_id,status,checkout_url,payment_date,receipt_reference,period_start,period_end,created_at`

func scanSubscriptionPayment(row scanner) (p billing.Payment, err error) {
	err = row.Scan(&p.ID, &p.OrganizationID, &p.SubscriptionID, &p.PlanID, &p.AmountMinor, &p.Currency, &p.CurrencyExponent, &p.Interval, &p.Provider, &p.SessionID, &p.TransactionID, &p.Status, &p.CheckoutURL, &p.PaymentDate, &p.ReceiptReference, &p.PeriodStart, &p.PeriodEnd, &p.CreatedAt)
	return
}

func (r *BillingRepository) Plans(all bool) ([]billing.Plan, error) {
	rows, err := r.db.Query(`SELECT `+planColumns+` FROM subscription_plans WHERE $1 OR active ORDER BY billing_interval`, all)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := []billing.Plan{}
	for rows.Next() {
		p, e := scanPlan(rows)
		if e != nil {
			return nil, e
		}
		list = append(list, p)
	}
	return list, rows.Err()
}
func (r *BillingRepository) SavePlan(p billing.Plan, actor ...string) (billing.Plan, error) {
	if p.Interval != "month" && p.Interval != "year" {
		return p, errors.New("only paid monthly and yearly plans can be managed")
	}
	if p.Name == "" || len(p.Name) > 120 || p.AmountMinor == nil || *p.AmountMinor <= 0 || *p.AmountMinor > 9000000000000 || p.Currency == nil || len(*p.Currency) != 3 || p.CurrencyExponent < 0 || p.CurrencyExponent > 3 {
		return p, errors.New("name, positive price in minor units, ISO currency and currency exponent are required")
	}
	for _, c := range *p.Currency {
		if c < 'A' || c > 'Z' {
			return p, errors.New("currency must be three uppercase letters")
		}
	}
	if p.YearlyDiscountPercent != nil && (p.Interval != "year" || math.IsNaN(*p.YearlyDiscountPercent) || *p.YearlyDiscountPercent <= 0 || *p.YearlyDiscountPercent >= 100) {
		return p, errors.New("invalid yearly discount")
	}
	if p.ID == "" {
		p.ID = uuid.NewString()
	}
	tx, err := r.db.Begin()
	if err != nil {
		return p, err
	}
	defer tx.Rollback()
	var old string
	err = tx.QueryRow(`SELECT billing_interval FROM subscription_plans WHERE id=$1 FOR UPDATE`, p.ID).Scan(&old)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return p, err
	}
	if err == nil && old != p.Interval {
		return p, errors.New("a plan's billing interval cannot be changed")
	}
	_, err = tx.Exec(`INSERT INTO subscription_plans(id,name,billing_interval,amount_minor,currency,currency_exponent,yearly_discount_percent,active) VALUES($1,$2,$3,$4,$5,$6,$7,$8)
 ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,amount_minor=EXCLUDED.amount_minor,currency=EXCLUDED.currency,currency_exponent=EXCLUDED.currency_exponent,yearly_discount_percent=EXCLUDED.yearly_discount_percent,active=EXCLUDED.active,updated_at=NOW()`, p.ID, p.Name, p.Interval, *p.AmountMinor, *p.Currency, p.CurrencyExponent, p.YearlyDiscountPercent, p.Active)
	if err != nil {
		return p, err
	}
	_, err = tx.Exec(`INSERT INTO billing_events(id,event_type,dedupe_key,details) VALUES($1::uuid,'plan_updated',$1::uuid::text,jsonb_build_object('planId',$2::text,'actorId',$3::text))`, uuid.NewString(), p.ID, billingActor(actor))
	if err != nil {
		return p, err
	}
	return p, tx.Commit()
}

// Event audit and the deduplicated notification outbox commit atomically.
func billingActor(actor []string) string {
	if len(actor) > 0 {
		return actor[0]
	}
	return "system"
}
func billingEvent(tx *sql.Tx, org, sub, pay, kind, key, message string, actor ...string) error {
	_, err := tx.Exec(`INSERT INTO billing_events(id,organization_id,subscription_id,payment_id,event_type,dedupe_key,details) VALUES($1,$2,$3,NULLIF($4,'')::uuid,$5,$6,jsonb_build_object('actorId',$7::text)) ON CONFLICT(dedupe_key) DO NOTHING`, uuid.NewString(), org, sub, pay, kind, key, billingActor(actor))
	if err != nil {
		return err
	}
	if message != "" {
		_, err = tx.Exec(`INSERT INTO billing_notifications(id,organization_id,event_key,event_type,message) VALUES($1,$2,$3,$4,$5) ON CONFLICT(event_key) DO NOTHING`, uuid.NewString(), org, key, kind, message)
	}
	return err
}

func (r *BillingRepository) RegisterOrganization(ctx context.Context, name, admin, email, phone, hash string) (string, string, error) {
	org, id, sub := uuid.NewString(), "STF-"+uuid.NewString(), uuid.NewString()
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return "", "", err
	}
	defer tx.Rollback()
	_, err = tx.Exec(`INSERT INTO organizations(id,name,email,phone,trial_started_at,trial_ends_at) VALUES($1,$2,$3,$4,NOW(),NOW()+INTERVAL '168 hours')`, org, name, email, phone)
	if err != nil {
		return "", "", err
	}
	_, err = tx.Exec(`INSERT INTO initial_trial_claims(email,organization_id) VALUES($1,$2)`, email, org)
	if err != nil {
		return "", "", err
	}
	_, err = tx.Exec(`INSERT INTO users(id,organization_id,name,email,password_hash,role,branch,permissions) VALUES($1,$2,$3,$4,$5,'Admin','Head Office','{"approveLoans":true,"recordRepayments":true,"exportReports":true,"manageSettings":true,"manageCustomers":true}')`, id, org, admin, email, hash)
	if err != nil {
		return "", "", err
	}
	_, err = tx.Exec(`UPDATE organizations SET owner_id=$2 WHERE id=$1`, org, id)
	if err != nil {
		return "", "", err
	}
	_, err = tx.Exec(`INSERT INTO subscriptions(id,organization_id,plan_id,status,trial_start,trial_end) SELECT $1,id,'00000000-0000-0000-0000-000000000007','trialing',trial_started_at,trial_ends_at FROM organizations WHERE id=$2`, sub, org)
	if err != nil {
		return "", "", err
	}
	_, err = tx.Exec(`INSERT INTO system_settings(organization_id,id,system_name) VALUES($1,1,$2)`, org, name)
	if err != nil {
		return "", "", err
	}
	if err = billingEvent(tx, org, sub, "", "subscription_created", sub+":created", ""); err != nil {
		return "", "", err
	}
	if err = billingEvent(tx, org, sub, "", "trial_started", sub+":trial_started", "Your 7-day free trial has started. No card is required."); err != nil {
		return "", "", err
	}
	return org, id, tx.Commit()
}

func (r *BillingRepository) Snapshot(org string) (billing.Snapshot, error) {
	var out billing.Snapshot
	tx, err := r.db.Begin()
	if err != nil {
		return out, err
	}
	defer tx.Rollback()
	s, err := scanSubscription(tx.QueryRow(`SELECT `+subscriptionColumns+` FROM subscriptions WHERE organization_id=$1 FOR UPDATE`, org))
	if err != nil {
		return out, err
	}
	if err = tx.QueryRow(`SELECT clock_timestamp(),name,status,legacy_access_until FROM organizations WHERE id=$1`, org).Scan(&out.ServerTime, &out.OrganizationName, &out.OrganizationStatus, &out.LegacyAccessUntil); err != nil {
		return out, err
	}
	status := billing.EffectiveStatus(s, out.ServerTime)
	if status != s.Status {
		kind := "subscription_expired"
		message := "Your subscription has expired. Renew to resume new lending. Records and repayment recording remain available."
		if s.Status == "trialing" {
			kind = "trial_expired"
			message = "Your free trial has expired. Choose a subscription plan to continue new lending."
		}
		if status == "canceled" {
			kind = "subscription_canceled"
		}
		if _, err = tx.Exec(`UPDATE subscriptions SET status=$2,updated_at=NOW() WHERE id=$1`, s.ID, status); err != nil {
			return out, err
		}
		if err = billingEvent(tx, org, s.ID, "", kind, s.ID+":"+kind+":"+s.UpdatedKey(), message); err != nil {
			return out, err
		}
		s.Status = status
	}
	if s.TrialEnd != nil && s.Status == "trialing" {
		out.TrialDaysRemaining = int(math.Ceil(s.TrialEnd.Sub(out.ServerTime).Hours() / 24))
		if out.TrialDaysRemaining <= 3 {
			if err = billingEvent(tx, org, s.ID, "", "trial_ending_soon", s.ID+":trial_ending_soon", fmt.Sprintf("Your free trial ends in %d days.", out.TrialDaysRemaining)); err != nil {
				return out, err
			}
		}
	}
	if s.Status == "active" && s.PeriodEnd != nil && s.PeriodEnd.Sub(out.ServerTime) <= 7*24*time.Hour {
		if err = billingEvent(tx, org, s.ID, "", "subscription_expiring_soon", s.ID+":expiring:"+s.PeriodEnd.Format(time.RFC3339Nano), "Your subscription expires soon. Renew before the end of your current billing period."); err != nil {
			return out, err
		}
	}
	out.Subscription = s
	out.CanCreate = out.OrganizationStatus == "active" && (s.Status == "trialing" || s.Status == "active" || (out.LegacyAccessUntil != nil && out.ServerTime.Before(*out.LegacyAccessUntil) && s.Status != "suspended"))
	if out.OrganizationStatus == "suspended" {
		out.Subscription.Status = "suspended"
	}
	if s.PlanID != nil {
		p, e := scanPlan(tx.QueryRow(`SELECT `+planColumns+` FROM subscription_plans WHERE id=$1`, *s.PlanID))
		if e != nil {
			return out, e
		}
		out.Plan = &p
	}
	return out, tx.Commit()
}

func (r *BillingRepository) Payments(org string, offset ...int) ([]billing.Payment, error) {
	pageOffset := 0
	if len(offset) > 0 {
		pageOffset = offset[0]
	}
	rows, err := r.db.Query(`SELECT `+paymentColumns+` FROM subscription_payments WHERE organization_id=$1 ORDER BY created_at DESC,id DESC LIMIT 100 OFFSET $2`, org, pageOffset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := []billing.Payment{}
	for rows.Next() {
		p, e := scanSubscriptionPayment(rows)
		if e != nil {
			return nil, e
		}
		list = append(list, p)
	}
	return list, rows.Err()
}
func (r *BillingRepository) Payment(org, id string) (billing.Payment, error) {
	return scanSubscriptionPayment(r.db.QueryRow(`SELECT `+paymentColumns+` FROM subscription_payments WHERE organization_id=$1 AND id=$2`, org, id))
}

func (r *BillingRepository) Cancel(org string, actor ...string) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	s, err := scanSubscription(tx.QueryRow(`SELECT `+subscriptionColumns+` FROM subscriptions WHERE organization_id=$1 FOR UPDATE`, org))
	if err != nil {
		return err
	}
	if s.CancelAtPeriodEnd || s.Status == "canceled" {
		return nil
	}
	_, err = tx.Exec(`UPDATE subscriptions SET cancel_at_period_end=true,canceled_at=NOW(),status=CASE WHEN status='trialing' THEN 'canceled' ELSE status END,updated_at=NOW() WHERE id=$1`, s.ID)
	if err != nil {
		return err
	}
	if err = billingEvent(tx, org, s.ID, "", "subscription_canceled", s.ID+":canceled:"+s.UpdatedKey(), "Your subscription has been canceled. Any paid access continues until the billing period ends.", billingActor(actor)); err != nil {
		return err
	}
	return tx.Commit()
}
