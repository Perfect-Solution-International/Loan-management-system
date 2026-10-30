package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/mail"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
	"loan-management-backend/billing"
	"loan-management-backend/config"
	"loan-management-backend/database"
	"loan-management-backend/middleware"
	"loan-management-backend/repository"
)

type BillingHandler struct {
	db        *database.DB
	repo      *repository.BillingRepository
	cfg       *config.Config
	provider  billing.Provider
	configErr error
}

func NewBillingHandler(db *database.DB, cfg *config.Config) *BillingHandler {
	h := &BillingHandler{db: db, repo: repository.NewBillingRepository(db), cfg: cfg}
	if cfg.Env == "development" && cfg.BillingProviderName() == "test" && len(cfg.BillingTestSecret) >= 32 {
		h.provider = &billing.TestProvider{Secret: cfg.BillingTestSecret}
	}
	if cfg.BillingProviderName() == "onepay" {
		provider := &billing.OnePayProvider{AppID: cfg.OnePayAppID, HashSalt: cfg.OnePayHashSalt, ReturnURL: cfg.OnePayReturnURL, AppToken: cfg.OnePayAppToken, APIBase: cfg.OnePayAPIBase}
		provider.Contact = h.repo.BillingContact
		provider.Lookup = func(ctx context.Context, session string) (billing.Payment, error) {
			var org, id string
			if err := db.QueryRowContext(ctx, `SELECT organization_id,id FROM subscription_payments WHERE provider='onepay' AND provider_session_id=$1`, session).Scan(&org, &id); err != nil {
				return billing.Payment{}, err
			}
			return h.repo.Payment(org, id)
		}
		if err := provider.ValidateConfig(); err != nil {
			h.configErr = err
		} else {
			h.provider = provider
		}
	}
	if h.provider == nil && h.configErr == nil {
		switch cfg.BillingProviderName() {
		case "", "disabled":
			h.configErr = errors.New("Online subscription payments are disabled. Configure BILLING_PROVIDER=onepay and the OnePay backend settings. Your 7-day free trial remains available.")
		case "test":
			h.configErr = errors.New("Development payment testing requires ENV=development and a test secret of at least 32 characters")
		default:
			h.configErr = errors.New("Unsupported billing provider. Configure BILLING_PROVIDER=onepay")
		}
	}
	return h
}
func billingFail(w http.ResponseWriter, err error) {
	status := http.StatusBadRequest
	message := err.Error()
	var pe *pq.Error
	if errors.As(err, &pe) {
		status = 409
		message = "This request conflicts with an existing account or payment. Retry the saved checkout or use a different account."
		if pe.Code != "23505" && pe.Code != "23503" && pe.Code != "23514" {
			status = 500
			message = "Billing is temporarily unavailable"
			log.Printf("billing database error: %v", err)
		}
	}
	if errors.Is(err, sql.ErrNoRows) {
		status = 404
		message = "Billing record not found"
	}
	if errors.Is(err, repository.ErrConflict) {
		status = 409
	}
	sendJSON(w, status, map[string]string{"error": message})
}
func decodeBilling(w http.ResponseWriter, r *http.Request, v any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, 64*1024)
	d := json.NewDecoder(r.Body)
	d.DisallowUnknownFields()
	if err := d.Decode(v); err != nil {
		sendJSON(w, 400, map[string]string{"error": "Invalid request body"})
		return false
	}
	if d.Decode(&struct{}{}) != io.EOF {
		sendJSON(w, 400, map[string]string{"error": "A single JSON object is required"})
		return false
	}
	return true
}
func orgClaims(r *http.Request) *middleware.Claims {
	c, _ := r.Context().Value(middleware.UserContextKey).(*middleware.Claims)
	return c
}
func (h *BillingHandler) Plans(w http.ResponseWriter, r *http.Request) {
	plans, err := h.repo.Plans(false)
	if err != nil {
		billingFail(w, err)
		return
	}
	resp := map[string]any{
		"plans":           plans,
		"paymentsEnabled": h.provider != nil,
		"testMode":        h.provider != nil && h.provider.Name() == "test",
		"recurring":       h.provider != nil && h.provider.Recurring(),
	}
	if h.provider != nil {
		resp["provider"] = h.provider.Name()
	} else if h.cfg.BillingProviderName() != "" {
		resp["provider"] = h.cfg.BillingProviderName()
	}
	if h.configErr != nil {
		resp["configError"] = h.configErr.Error()
	}
	sendJSON(w, 200, resp)
}
func (h *BillingHandler) Register(w http.ResponseWriter, r *http.Request) {
	var in struct {
		OrganizationName string `json:"organizationName"`
		AdminName        string `json:"adminName"`
		Email            string `json:"email"`
		Phone            string `json:"phone"`
		Password         string `json:"password"`
		ConfirmPassword  string `json:"confirmPassword"`
	}
	if !decodeBilling(w, r, &in) {
		return
	}
	in.OrganizationName = strings.TrimSpace(in.OrganizationName)
	in.AdminName = strings.TrimSpace(in.AdminName)
	in.Email = strings.ToLower(strings.TrimSpace(in.Email))
	in.Phone = strings.TrimSpace(in.Phone)
	address, err := mail.ParseAddress(in.Email)
	if err != nil || address.Address != in.Email || len(in.Email) > 254 || len(in.OrganizationName) < 2 || len(in.OrganizationName) > 200 || len(in.AdminName) < 2 || len(in.AdminName) > 200 || len(in.Phone) < 7 || len(in.Phone) > 30 || len(in.Password) < 12 || len(in.Password) > 72 || in.Password != in.ConfirmPassword {
		sendJSON(w, 400, map[string]string{"error": "Enter valid organization and contact details, and matching passwords of 12 to 72 characters"})
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), bcrypt.DefaultCost)
	if err != nil {
		billingFail(w, err)
		return
	}
	org, id, err := h.repo.RegisterOrganization(r.Context(), in.OrganizationName, in.AdminName, in.Email, in.Phone, string(hash))
	if err != nil {
		billingFail(w, err)
		return
	}
	token, err := middleware.GenerateToken(id, in.Email, "Admin", h.cfg)
	if err != nil {
		billingFail(w, err)
		return
	}
	sendJSON(w, 201, map[string]string{"token": token, "organizationId": org, "userId": id})
}
func (h *BillingHandler) Subscription(w http.ResponseWriter, r *http.Request) {
	s, err := h.repo.Snapshot(orgClaims(r).OrganizationID)
	if err != nil {
		billingFail(w, err)
		return
	}
	s.PaymentsEnabled = h.provider != nil
	s.TestMode = h.provider != nil && h.provider.Name() == "test"
	s.Recurring = h.provider != nil && h.provider.Recurring()
	resp := map[string]any{
		"subscription":       s.Subscription,
		"plan":               s.Plan,
		"serverTime":         s.ServerTime,
		"trialDaysRemaining": s.TrialDaysRemaining,
		"canCreate":          s.CanCreate,
		"legacyAccessUntil":  s.LegacyAccessUntil,
		"organizationName":   s.OrganizationName,
		"organizationStatus": s.OrganizationStatus,
		"paymentsEnabled":    s.PaymentsEnabled,
		"testMode":           s.TestMode,
		"recurring":          s.Recurring,
	}
	if h.provider != nil {
		resp["provider"] = h.provider.Name()
	} else if h.cfg.BillingProviderName() != "" {
		resp["provider"] = h.cfg.BillingProviderName()
	}
	if h.configErr != nil {
		resp["configError"] = h.configErr.Error()
	}
	sendJSON(w, 200, resp)
}
func (h *BillingHandler) Checkout(w http.ResponseWriter, r *http.Request) {
	if h.provider == nil {
		msg := "Online subscription payments are not configured. Contact the platform administrator."
		if h.configErr != nil {
			msg = fmt.Sprintf("Payment configuration error: %v", h.configErr)
		}
		sendJSON(w, 503, map[string]string{"error": msg})
		return
	}
	var in struct {
		PlanID string `json:"planId"`
		Key    string `json:"idempotencyKey"`
	}
	if !decodeBilling(w, r, &in) {
		return
	}
	if _, err := uuid.Parse(in.PlanID); err != nil {
		sendJSON(w, 400, map[string]string{"error": "Select a valid paid plan"})
		return
	}
	p, err := h.repo.Checkout(r.Context(), orgClaims(r).OrganizationID, in.PlanID, in.Key, h.provider)
	if err != nil {
		billingFail(w, err)
		return
	}
	sendJSON(w, 200, p)
}
func (h *BillingHandler) Payments(w http.ResponseWriter, r *http.Request) {
	offset := 0
	if value := r.URL.Query().Get("offset"); value != "" {
		var err error
		offset, err = strconv.Atoi(value)
		if err != nil || offset < 0 || offset > 1000000 {
			sendJSON(w, 400, map[string]string{"error": "Invalid offset"})
			return
		}
	}
	p, err := h.repo.Payments(orgClaims(r).OrganizationID, offset)
	if err != nil {
		billingFail(w, err)
		return
	}
	sendJSON(w, 200, p)
}
func (h *BillingHandler) Payment(w http.ResponseWriter, r *http.Request) {
	p, err := h.repo.Payment(orgClaims(r).OrganizationID, chi.URLParam(r, "id"))
	if err != nil {
		billingFail(w, err)
		return
	}
	sendJSON(w, 200, p)
}
func (h *BillingHandler) Receipt(w http.ResponseWriter, r *http.Request) {
	p, err := h.repo.Payment(orgClaims(r).OrganizationID, chi.URLParam(r, "id"))
	if err != nil {
		billingFail(w, err)
		return
	}
	if p.Status != "succeeded" {
		sendJSON(w, 409, map[string]string{"error": "A receipt is available only after verified payment"})
		return
	}
	sendJSON(w, 200, map[string]any{"receiptReference": p.ReceiptReference, "payment": p, "issuedBy": "PSI One", "testReceipt": p.Provider == "test"})
}
func (h *BillingHandler) Cancel(w http.ResponseWriter, r *http.Request) {
	if err := h.repo.Cancel(orgClaims(r).OrganizationID, orgClaims(r).UserID); err != nil {
		billingFail(w, err)
		return
	}
	h.Subscription(w, r)
}
func (h *BillingHandler) Webhook(w http.ResponseWriter, r *http.Request) {
	if h.provider == nil || chi.URLParam(r, "provider") != h.provider.Name() {
		sendJSON(w, 404, map[string]string{"error": "Payment provider is unavailable"})
		return
	}
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 64*1024))
	if err != nil {
		sendJSON(w, 400, map[string]string{"error": "Invalid webhook body"})
		return
	}
	e, err := h.provider.Verify(r.Context(), r.Header, body)
	if errors.Is(err, billing.ErrPaymentPending) {
		sendJSON(w, 200, map[string]bool{"received": true})
		return
	}
	if err != nil {
		status := http.StatusUnauthorized
		if h.provider.Name() == "onepay" {
			status = http.StatusServiceUnavailable
		}
		sendJSON(w, status, map[string]string{"error": "Payment provider verification could not be completed"})
		return
	}
	if h.provider.Name() == "onepay" {
		body, _ = json.Marshal(e)
	}
	if err = h.repo.ApplyVerifiedEvent(r.Context(), h.provider.Name(), e, body); err != nil {
		billingFail(w, err)
		return
	}
	sendJSON(w, 200, map[string]bool{"received": true})
}

// Explicit authenticated reconciliation also handles a delayed/missed callback.
func (h *BillingHandler) Reconcile(w http.ResponseWriter, r *http.Request) {
	p, err := h.repo.Payment(orgClaims(r).OrganizationID, chi.URLParam(r, "id"))
	if err != nil {
		billingFail(w, err)
		return
	}
	if p.Provider != "onepay" || p.Status == "succeeded" || p.SessionID == nil {
		sendJSON(w, 200, p)
		return
	}
	if h.provider == nil || h.provider.Name() != "onepay" {
		sendJSON(w, 503, map[string]string{"error": "OnePay is unavailable"})
		return
	}
	body, _ := json.Marshal(map[string]string{"transaction_id": *p.SessionID})
	e, err := h.provider.Verify(r.Context(), nil, body)
	if errors.Is(err, billing.ErrPaymentPending) {
		sendJSON(w, 200, p)
		return
	}
	if err != nil {
		sendJSON(w, 503, map[string]string{"error": "Unable to confirm payment with OnePay. Your saved payment is retained."})
		return
	}
	canonical, _ := json.Marshal(e)
	if err = h.repo.ApplyVerifiedEvent(r.Context(), "onepay", e, canonical); err != nil {
		billingFail(w, err)
		return
	}
	h.Payment(w, r)
}
func (h *BillingHandler) TestComplete(w http.ResponseWriter, r *http.Request) {
	test, ok := h.provider.(*billing.TestProvider)
	if !ok || h.cfg.Env != "development" {
		sendJSON(w, 404, map[string]string{"error": "Not found"})
		return
	}
	var in struct {
		Status string `json:"status"`
	}
	if !decodeBilling(w, r, &in) {
		return
	}
	if in.Status != "succeeded" && in.Status != "failed" && in.Status != "canceled" {
		sendJSON(w, 400, map[string]string{"error": "Invalid test outcome"})
		return
	}
	p, err := h.repo.Payment(orgClaims(r).OrganizationID, chi.URLParam(r, "id"))
	if err != nil {
		billingFail(w, err)
		return
	}
	if p.SessionID == nil {
		sendJSON(w, 409, map[string]string{"error": "Checkout is not ready"})
		return
	}
	e := billing.VerifiedEvent{ID: "test_" + p.ID + "_" + in.Status, PaymentID: p.ID, OrganizationID: p.OrganizationID, SubscriptionID: p.SubscriptionID, SessionID: *p.SessionID, TransactionID: "test_tx_" + p.ID, AmountMinor: p.AmountMinor, Currency: p.Currency, Status: in.Status}
	body, _ := json.Marshal(e)
	verified, err := test.Verify(r.Context(), test.Headers(body, time.Now()), body)
	if err == nil {
		err = h.repo.ApplyVerifiedEvent(r.Context(), test.Name(), verified, body)
	}
	if err != nil {
		billingFail(w, err)
		return
	}
	h.Payment(w, r)
}
func (h *BillingHandler) Notifications(w http.ResponseWriter, r *http.Request) {
	var result []byte
	err := h.db.QueryRow(`SELECT COALESCE(json_agg(n),'[]'::json) FROM (SELECT id,event_type AS "eventType",message,created_at AS "createdAt" FROM billing_notifications WHERE organization_id=$1 ORDER BY created_at DESC LIMIT 50)n`, orgClaims(r).OrganizationID).Scan(&result)
	if err != nil {
		billingFail(w, err)
		return
	}
	sendJSON(w, 200, json.RawMessage(result))
}
func (h *BillingHandler) PlatformLogin(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if !decodeBilling(w, r, &in) {
		return
	}
	var id, hash string
	err := h.db.QueryRow(`SELECT id,password_hash FROM platform_administrators WHERE LOWER(email)=LOWER($1) AND active`, strings.TrimSpace(in.Email)).Scan(&id, &hash)
	if err != nil || bcrypt.CompareHashAndPassword([]byte(hash), []byte(in.Password)) != nil {
		sendJSON(w, 401, map[string]string{"error": "Invalid platform credentials"})
		return
	}
	token, err := middleware.GenerateToken(id, in.Email, "PlatformAdmin", h.cfg)
	if err != nil {
		billingFail(w, err)
		return
	}
	sendJSON(w, 200, map[string]string{"token": token})
}
func (h *BillingHandler) RequirePlatform(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c := orgClaims(r)
		var active bool
		if c == nil || c.Role != "PlatformAdmin" || h.db.QueryRow(`SELECT active FROM platform_administrators WHERE id=$1`, c.UserID).Scan(&active) != nil || !active {
			sendJSON(w, 403, map[string]string{"error": "Platform administrator access required"})
			return
		}
		next.ServeHTTP(w, r)
	})
}
func (h *BillingHandler) PlatformPlans(w http.ResponseWriter, r *http.Request) {
	p, err := h.repo.Plans(true)
	if err != nil {
		billingFail(w, err)
		return
	}
	sendJSON(w, 200, p)
}
func (h *BillingHandler) SavePlan(w http.ResponseWriter, r *http.Request) {
	var p billing.Plan
	if !decodeBilling(w, r, &p) {
		return
	}
	if id := chi.URLParam(r, "id"); id != "" {
		p.ID = id
	}
	if p.ID != "" {
		if _, err := uuid.Parse(p.ID); err != nil {
			billingFail(w, err)
			return
		}
	}
	p, err := h.repo.SavePlan(p, orgClaims(r).UserID)
	if err != nil {
		billingFail(w, err)
		return
	}
	sendJSON(w, 200, p)
}
func (h *BillingHandler) PlatformList(w http.ResponseWriter, r *http.Request) {
	var result []byte
	var query string
	statusSQL := `CASE WHEN o.status='suspended' OR s.status='suspended' THEN 'suspended' WHEN s.status='trialing' AND s.trial_end<=clock_timestamp() THEN 'expired' WHEN s.status='active' AND s.current_period_end<=clock_timestamp() THEN CASE WHEN s.cancel_at_period_end THEN 'canceled' ELSE 'expired' END ELSE s.status END`
	if strings.HasSuffix(r.URL.Path, "/organizations") {
		query = `SELECT COALESCE(json_agg(o),'[]'::json) FROM (SELECT o.id,o.name,o.email,o.phone,o.owner_id AS "ownerId",o.registered_at AS "registeredAt",o.status,s.id AS "subscriptionId",` + statusSQL + ` AS "subscriptionStatus",s.trial_start AS "trialStart",s.trial_end AS "trialEnd" FROM organizations o LEFT JOIN subscriptions s ON s.organization_id=o.id ORDER BY o.registered_at DESC LIMIT 100 OFFSET $1)o`
	} else {
		query = `SELECT COALESCE(json_agg(items),'[]'::json) FROM (SELECT s.id,s.organization_id AS "organizationId",` + statusSQL + ` AS status,s.plan_id AS "planId",s.trial_end AS "trialEnd",s.current_period_end AS "currentPeriodEnd",s.cancel_at_period_end AS "cancelAtPeriodEnd" FROM subscriptions s JOIN organizations o ON o.id=s.organization_id ORDER BY s.created_at DESC LIMIT 100 OFFSET $1)items`
	}
	offset := 0
	if v := r.URL.Query().Get("offset"); v != "" {
		if _, err := fmt.Sscanf(v, "%d", &offset); err != nil || offset < 0 || offset > 1000000 {
			sendJSON(w, 400, map[string]string{"error": "Invalid offset"})
			return
		}
	}
	if err := h.db.QueryRow(query, offset).Scan(&result); err != nil {
		billingFail(w, err)
		return
	}
	sendJSON(w, 200, json.RawMessage(result))
}

func (h *BillingHandler) SetOrganizationStatus(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Status string `json:"status"`
	}
	if !decodeBilling(w, r, &in) {
		return
	}
	id := chi.URLParam(r, "id")
	if _, err := uuid.Parse(id); err != nil {
		sendJSON(w, 400, map[string]string{"error": "Invalid organization ID"})
		return
	}
	if err := h.repo.SetOrganizationStatus(r.Context(), id, in.Status, orgClaims(r).UserID); err != nil {
		billingFail(w, err)
		return
	}
	sendJSON(w, 200, map[string]string{"status": in.Status})
}

// Live state/role is loaded from the database; a client organization ID or JWT
// role alone is never accepted as tenant authorization.
func (h *BillingHandler) Organization(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c := orgClaims(r)
		if c == nil || c.Role == "PlatformAdmin" {
			sendJSON(w, 403, map[string]string{"error": "Organization account required"})
			return
		}
		current := *c
		var role, status string
		table := "users"
		if c.Role == "Customer" {
			table = "customers"
		}
		columns := "organization_id,role,status,permissions"
		if table == "customers" {
			columns = "organization_id,'Customer',status,'{}'::jsonb"
		}
		var permissions []byte
		err := h.db.QueryRow(`SELECT `+columns+` FROM `+table+` WHERE id=$1`, c.UserID).Scan(&current.OrganizationID, &role, &status, &permissions)
		if err != nil || status != "Active" || role != c.Role {
			sendJSON(w, 401, map[string]string{"error": "Account unavailable"})
			return
		}
		current.Role = role
		if err = json.Unmarshal(permissions, &current.Permissions); err != nil {
			sendJSON(w, 401, map[string]string{"error": "Account permissions unavailable"})
			return
		}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), middleware.UserContextKey, &current)))
	})
}
func (h *BillingHandler) RequireOrganizationAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if orgClaims(r).Role != "Admin" {
			sendJSON(w, 403, map[string]string{"error": "Organization administrator access required"})
			return
		}
		next.ServeHTTP(w, r)
	})
}
