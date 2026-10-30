package repository

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"loan-management-backend/billing"
)

// Checkout persists the attempt BEFORE contacting the provider. An uncertain
// provider response retains that attempt; a retry uses the same provider key.
func (r *BillingRepository) Checkout(ctx context.Context, org, planID, key string, provider billing.Provider) (billing.Payment, error) {
	var empty billing.Payment
	if _, err := uuid.Parse(key); err != nil {
		return empty, errors.New("a UUID idempotencyKey is required")
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return empty, err
	}
	defer tx.Rollback()
	s, err := scanSubscription(tx.QueryRow(`SELECT `+subscriptionColumns+` FROM subscriptions WHERE organization_id=$1 FOR UPDATE`, org))
	if err != nil {
		return empty, err
	}
	var orgStatus string
	if err = tx.QueryRow(`SELECT status FROM organizations WHERE id=$1`, org).Scan(&orgStatus); err != nil {
		return empty, err
	}
	if s.Status == "suspended" || orgStatus != "active" {
		return empty, errors.New("subscription is suspended; contact platform support")
	}
	p, err := scanSubscriptionPayment(tx.QueryRow(`SELECT `+paymentColumns+` FROM subscription_payments WHERE organization_id=$1 AND idempotency_key=$2`, org, key))
	if err == nil {
		if p.PlanID != planID {
			return empty, ErrConflict
		}
	} else if errors.Is(err, sql.ErrNoRows) {
		p, err = scanSubscriptionPayment(tx.QueryRow(`SELECT `+paymentColumns+` FROM subscription_payments WHERE organization_id=$1 AND status='pending'`, org))
		if err == nil && p.PlanID != planID {
			return empty, errors.New("finish or cancel the pending checkout before changing plans")
		}
		if errors.Is(err, sql.ErrNoRows) {
			plan, e := scanPlan(tx.QueryRow(`SELECT `+planColumns+` FROM subscription_plans WHERE id=$1 AND active AND billing_interval IN ('month','year') FOR SHARE`, planID))
			if e != nil {
				return empty, e
			}
			p, err = scanSubscriptionPayment(tx.QueryRow(`INSERT INTO subscription_payments(id,organization_id,subscription_id,plan_id,amount_minor,currency,currency_exponent,billing_interval,provider,idempotency_key)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING `+paymentColumns, uuid.NewString(), org, s.ID, plan.ID, *plan.AmountMinor, *plan.Currency, plan.CurrencyExponent, plan.Interval, provider.Name(), key))
			if err == nil {
				err = billingEvent(tx, org, s.ID, p.ID, "payment_initiated", p.ID+":initiated", "")
			}
		}
	}
	if err != nil {
		return empty, err
	}
	if err = tx.Commit(); err != nil {
		return empty, err
	}
	if p.Status != "pending" || p.SessionID != nil {
		return p, nil
	}
	if p.Provider != provider.Name() {
		return empty, errors.New("pending checkout belongs to a different provider; contact support for reconciliation")
	}
	if provider.Name() == "onepay" {
		if validator, ok := provider.(interface {
			Validate(context.Context, billing.Payment) error
		}); ok {
			if err := validator.Validate(ctx, p); err != nil {
				return p, err
			}
		}
		result, claimErr := r.db.ExecContext(ctx, `UPDATE subscription_payments SET checkout_started_at=NOW() WHERE id=$1 AND checkout_started_at IS NULL AND provider_session_id IS NULL`, p.ID)
		if claimErr != nil {
			return p, claimErr
		}
		count, claimErr := result.RowsAffected()
		if claimErr != nil {
			return p, claimErr
		}
		if count != 1 {
			return p, errors.New("OnePay checkout is already being prepared or requires reconciliation; contact support before starting another payment")
		}
	}
	// Providers with documented idempotency may retry; OnePay uses the claim above.
	session, url, err := provider.Create(ctx, p)
	if err != nil {
		return p, fmt.Errorf("checkout outcome uncertain; retain this saved attempt for reconciliation: %w", err)
	}
	if session == "" || url == "" {
		return p, errors.New("provider returned an incomplete checkout; saved attempt requires reconciliation")
	}
	result, err := r.db.Exec(`UPDATE subscription_payments SET provider_session_id=$3,checkout_url=$4 WHERE organization_id=$1 AND id=$2 AND (provider_session_id IS NULL OR provider_session_id=$3)`, org, p.ID, session, url)
	if err = affected(result, err); err != nil {
		return p, err
	}
	return r.Payment(org, p.ID)
}

func (r *BillingRepository) ApplyVerifiedEvent(ctx context.Context, provider string, e billing.VerifiedEvent, body []byte) error {
	if provider == "" || e.ID == "" || len(e.ID) > 200 || e.TransactionID == "" || len(e.TransactionID) > 200 || (e.Status != "succeeded" && e.Status != "failed" && e.Status != "canceled") {
		return errors.New("invalid verified payment event")
	}
	for _, id := range []string{e.OrganizationID, e.SubscriptionID, e.PaymentID} {
		if _, err := uuid.Parse(id); err != nil {
			return errors.New("invalid verified payment identity")
		}
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	s, err := scanSubscription(tx.QueryRow(`SELECT `+subscriptionColumns+` FROM subscriptions WHERE organization_id=$1 AND id=$2 FOR UPDATE`, e.OrganizationID, e.SubscriptionID))
	if err != nil {
		return err
	}
	p, err := scanSubscriptionPayment(tx.QueryRow(`SELECT `+paymentColumns+` FROM subscription_payments WHERE organization_id=$1 AND subscription_id=$2 AND id=$3 FOR UPDATE`, e.OrganizationID, e.SubscriptionID, e.PaymentID))
	if err != nil {
		return err
	}
	if p.Provider != provider || p.SessionID == nil || *p.SessionID != e.SessionID || p.AmountMinor != e.AmountMinor || p.Currency != e.Currency {
		return errors.New("provider transaction does not match saved checkout")
	}
	sum := sha256.Sum256(body)
	hash := hex.EncodeToString(sum[:])
	var previous string
	err = tx.QueryRow(`SELECT payload_hash FROM billing_webhook_events WHERE provider=$1 AND event_id=$2`, provider, e.ID).Scan(&previous)
	if err == nil {
		if previous != hash {
			return ErrConflict
		}
		return nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return err
	}
	_, err = tx.Exec(`INSERT INTO billing_webhook_events(provider,event_id,payment_id,payload_hash) VALUES($1,$2,$3,$4)`, provider, e.ID, p.ID, hash)
	if err != nil {
		return err
	}
	// A completed payment is terminal. Late failures and repeated successes can
	// never revoke access, credit another period, or emit misleading notifications.
	if p.Status == "succeeded" {
		if p.TransactionID == nil || *p.TransactionID != e.TransactionID {
			return errors.New("a completed checkout received a different transaction reference; provider reconciliation required")
		}
		return tx.Commit()
	}
	if e.Status != "succeeded" {
		// Failure/cancellation is terminal unless the provider later verifies success.
		if p.Status != "pending" {
			return tx.Commit()
		}
		_, err = tx.Exec(`UPDATE subscription_payments SET status=$2,provider_transaction_id=$3 WHERE id=$1`, p.ID, e.Status, e.TransactionID)
		if err != nil {
			return err
		}
		if err = billingEvent(tx, e.OrganizationID, s.ID, p.ID, "payment_"+e.Status, p.ID+":"+e.Status, "Your subscription payment was "+e.Status+". Existing paid access is unchanged."); err != nil {
			return err
		}
		// A failed advance renewal does not revoke an unexpired paid period.
		if s.Status == "expired" {
			_, err = tx.Exec(`UPDATE subscriptions SET status='past_due',updated_at=NOW() WHERE id=$1`, s.ID)
			if err != nil {
				return err
			}
		}
		return tx.Commit()
	}
	var nowStart sql.NullTime
	if err = tx.QueryRow(`SELECT clock_timestamp()`).Scan(&nowStart); err != nil {
		return err
	}
	start := nowStart.Time.UTC()
	// Serialize on subscription; independent verified payments extend rather than
	// replace an existing paid period. An expired period starts at confirmation.
	if s.PeriodEnd != nil && s.PeriodEnd.After(start) {
		start = *s.PeriodEnd
	}
	months := 1
	if p.Interval == "year" {
		months = 12
	}
	end := billing.AddCalendarMonths(start, months)
	reference := "PSI-" + p.ID
	_, err = tx.Exec(`UPDATE subscription_payments SET status='succeeded',provider_transaction_id=$2,payment_date=NOW(),receipt_reference=$3,period_start=$4,period_end=$5 WHERE id=$1`, p.ID, e.TransactionID, reference, start, end)
	if err != nil {
		return err
	}
	// Respect a cancellation made AFTER this checkout began. A suspended account
	// remains suspended even after payment; only platform support can lift a hold.
	_, err = tx.Exec(`UPDATE subscriptions SET plan_id=$2,status=CASE WHEN status='suspended' THEN status ELSE 'active' END,
 current_period_start=CASE WHEN current_period_end>NOW() THEN current_period_start ELSE $3 END,current_period_end=$4,
 cancel_at_period_end=CASE WHEN canceled_at>$5 THEN cancel_at_period_end ELSE false END,
 canceled_at=CASE WHEN canceled_at>$5 THEN canceled_at ELSE NULL END,provider_reference=$6,updated_at=NOW() WHERE id=$1`, s.ID, p.PlanID, start, end, p.CreatedAt, e.TransactionID)
	if err != nil {
		return err
	}
	if err = billingEvent(tx, e.OrganizationID, s.ID, p.ID, "payment_succeeded", p.ID+":succeeded", "Your subscription payment has been verified. Your receipt is ready."); err != nil {
		return err
	}
	kind := "subscription_activated"
	if s.PeriodEnd != nil {
		kind = "subscription_renewed"
	}
	if err = billingEvent(tx, e.OrganizationID, s.ID, p.ID, kind, p.ID+":"+kind, "Your subscription is paid through "+end.UTC().Format("2006-01-02")+"."); err != nil {
		return err
	}
	return tx.Commit()
}

// Sweep handles expiry and reminders even when an organization makes no requests.
// Snapshot still enforces exact expiry if the worker is delayed or unavailable.
func (r *BillingRepository) Sweep(ctx context.Context) error {
	rows, err := r.db.QueryContext(ctx, `SELECT organization_id FROM subscriptions WHERE status IN ('trialing','active') ORDER BY organization_id`)
	if err != nil {
		return err
	}
	ids := []string{}
	for rows.Next() {
		var id string
		if err = rows.Scan(&id); err != nil {
			rows.Close()
			return err
		}
		ids = append(ids, id)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	for _, id := range ids {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		if _, err = r.Snapshot(id); err != nil {
			return err
		}
	}
	return nil
}
