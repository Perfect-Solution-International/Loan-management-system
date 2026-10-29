package main

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"loan-management-backend/billing"
	"loan-management-backend/config"
	"loan-management-backend/database"
	"loan-management-backend/middleware"
	"loan-management-backend/repository"
)

type uncertainCheckoutProvider struct{ billing.TestProvider }

type onePayClaimFixture struct {
	billing.TestProvider
	calls atomic.Int64
	fail  bool
}

func (*onePayClaimFixture) Name() string { return "onepay" }
func (p *onePayClaimFixture) Create(_ context.Context, payment billing.Payment) (string, string, error) {
	p.calls.Add(1)
	if p.fail {
		return "", "", errors.New("uncertain response")
	}
	return "onepay_" + payment.ID, "https://checkout.onepay.lk/test", nil
}

func (uncertainCheckoutProvider) Create(context.Context, billing.Payment) (string, string, error) {
	return "", "", errors.New("provider response timed out")
}

func decodeSaaS[T any](t *testing.T, b []byte) T {
	t.Helper()
	var out T
	if err := json.Unmarshal(b, &out); err != nil {
		t.Fatal(err)
	}
	return out
}

func TestSaaSIntegration(t *testing.T) {
	rootTest := t
	run := func(name string, fn func(*testing.T)) {
		rootTest.Run(name, func(current *testing.T) { t = current; defer func() { t = rootTest }(); fn(current) })
	}
	dsn := os.Getenv("TEST_DATABASE_DSN")
	if dsn == "" {
		t.Skip("set TEST_DATABASE_DSN to a disposable PostgreSQL database")
	}
	admin, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer admin.Close()
	schema := "saas_" + strings.ReplaceAll(uuid.NewString(), "-", "")
	if _, err = admin.Exec(`CREATE SCHEMA ` + schema); err != nil {
		t.Fatal(err)
	}
	defer admin.Exec(`DROP SCHEMA ` + schema + ` CASCADE`)
	db, err := sql.Open("postgres", dsn+" search_path="+schema)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	files, _ := filepath.Glob(filepath.Join("..", "..", "database", "migrations", "*.sql"))
	apply := func(file string) {
		t.Helper()
		data, e := os.ReadFile(file)
		if e != nil {
			t.Fatal(e)
		}
		tx, e := db.Begin()
		if e != nil {
			t.Fatal(e)
		}
		defer tx.Rollback()
		if _, e = tx.Exec(string(data)); e != nil {
			t.Fatalf("%s: %v", file, e)
		}
		if e = tx.Commit(); e != nil {
			t.Fatal(e)
		}
	}
	for _, file := range files {
		if filepath.Base(file) < "011_" {
			apply(file)
		}
	}
	apply(filepath.Join("..", "..", "database", "seed.sql"))
	// Exercise migration with an existing borrower, document, loan and financial ledger.
	_, err = db.Exec(`INSERT INTO loans(id,customer_id,loan_no,principal,total_repayment,status) VALUES('LEGACY-LOAN','CUS-01','LEGACY-LOAN',500,500,'Active'); INSERT INTO payments(id,loan_id,customer_id,amount,date,type,method,collected_by) VALUES('LEGACY-PAY','LEGACY-LOAN','CUS-01',100,CURRENT_DATE,'Capital','Cash','System Admin'); UPDATE customers SET documents='[{"id":"legacy-doc","title":"Preserved","fileUrl":"data:application/pdf;base64,VEVTVA=="}]' WHERE id='CUS-01'`)
	if err != nil {
		t.Fatal(err)
	}
	before := map[string]string{}
	tables := []string{"users", "customers", "loans", "payments", "online_payments", "loan_notes", "audit_logs", "system_settings"}
	for _, table := range tables {
		var data string
		if err = db.QueryRow(`SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),'[]'::jsonb)::text FROM ` + table + ` t`).Scan(&data); err != nil {
			t.Fatal(err)
		}
		before[table] = data
	}
	apply(filepath.Join("..", "..", "database", "migrations", "011_saas_subscriptions.sql"))
	for _, file := range files {
		if filepath.Base(file) > "011_saas_subscriptions.sql" {
			apply(file)
		}
	}
	run("migration_preserves_existing_records", func(t *testing.T) {
		for _, table := range tables {
			var data string
			if err = db.QueryRow(`SELECT COALESCE(jsonb_agg(to_jsonb(t)-'organization_id' ORDER BY (to_jsonb(t)-'organization_id')::text),'[]'::jsonb)::text FROM ` + table + ` t`).Scan(&data); err != nil {
				t.Fatal(err)
			}
			if before[table] != data {
				t.Fatalf("migration changed %s records", table)
			}
			var foreign int
			if err = db.QueryRow(`SELECT count(*) FROM `+table+` WHERE organization_id<>$1`, database.LegacyOrganization).Scan(&foreign); err != nil || foreign != 0 {
				t.Fatalf("legacy ownership: %s %v", table, err)
			}
		}
	})
	root := &database.DB{DB: db}
	if err = root.ValidateSaaS(); err != nil {
		t.Fatal(err)
	}
	cfg := &config.Config{Env: "development", JWTSecret: "test-signing-secret-long-enough", BillingProvider: "test", BillingTestSecret: strings.Repeat("s", 32)}
	router := newRouter(root, cfg)
	var calls atomic.Int64
	request := func(method, path, token string, body any) *httptest.ResponseRecorder {
		calls.Add(1)
		payload, _ := json.Marshal(body)
		req := httptest.NewRequest(method, path, bytes.NewReader(payload))
		req.Header.Set("Content-Type", "application/json")
		if token != "" {
			req.Header.Set("Authorization", "Bearer "+token)
		}
		res := httptest.NewRecorder()
		router.ServeHTTP(res, req)
		return res
	}
	call := func(method, path, token string, body any, status int) []byte {
		t.Helper()
		res := request(method, path, token, body)
		if res.Code != status {
			t.Fatalf("%s %s: got %d want %d: %s", method, path, res.Code, status, res.Body.String())
		}
		return res.Body.Bytes()
	}
	reg := func(name, email string) map[string]string {
		t.Helper()
		return decodeSaaS[map[string]string](t, call("POST", "/api/organizations/register", "", map[string]string{"organizationName": name, "adminName": "Test Owner", "email": email, "phone": "0771234567", "password": "SaaS-test-password-123", "confirmPassword": "SaaS-test-password-123"}, 201))
	}
	a, b := reg("Lender A", "owner-a@test.local"), reg("Lender B", "owner-b@test.local")
	tokenA, tokenB := a["token"], b["token"]
	snapshot := func(token string) billing.Snapshot {
		return decodeSaaS[billing.Snapshot](t, call("GET", "/api/billing/subscription", token, nil, 200))
	}
	initial := snapshot(tokenA)
	run("registration_and_immutable_seven_day_trial", func(t *testing.T) {
		s := initial.Subscription
		if s.Status != "trialing" || s.TrialEnd.Sub(*s.TrialStart) != 7*24*time.Hour || initial.TrialDaysRemaining != 7 || !initial.CanCreate {
			t.Fatalf("invalid trial: %+v", initial)
		}
		call("POST", "/api/organizations/register", "", map[string]string{"organizationName": "Duplicate", "adminName": "Test Owner", "email": "OWNER-A@test.local", "phone": "0771234567", "password": "SaaS-test-password-123", "confirmPassword": "SaaS-test-password-123"}, 409)
		if _, err := db.Exec(`UPDATE organizations SET trial_started_at=trial_started_at+INTERVAL '1 day',trial_ends_at=trial_ends_at+INTERVAL '1 day' WHERE id=$1`, a["organizationId"]); err == nil {
			t.Fatal("organization trial reset accepted")
		}
		if _, err := db.Exec(`UPDATE subscriptions SET trial_start=trial_start+INTERVAL '1 day',trial_end=trial_end+INTERVAL '1 day' WHERE organization_id=$1`, a["organizationId"]); err == nil {
			t.Fatal("subscription trial reset accepted")
		}
		if _, err := db.Exec(`UPDATE subscriptions SET status='active',current_period_start=NOW(),current_period_end=NOW()+INTERVAL '1 month' WHERE organization_id=$1`, a["organizationId"]); err == nil {
			t.Fatal("active subscription without a verified ledger payment accepted")
		}
		call("POST", "/api/organizations/register", "", map[string]string{"organizationName": "Manipulated", "adminName": "Test Owner", "email": "other@test.local", "phone": "0771234567", "password": "SaaS-test-password-123", "confirmPassword": "SaaS-test-password-123", "trialEnd": "2099-01-01"}, 400)
	})
	customer := func(token, id string) {
		call("POST", "/api/customers", token, map[string]any{"id": id, "name": "Borrower " + id, "nic": "SHARED-NIC", "phone": "0771234567", "password": "Borrower-test-123", "organizationId": b["organizationId"]}, 201)
	}
	customer(tokenA, "C-A")
	customer(tokenB, "C-B")
	loan := map[string]any{"id": "L-A", "customerId": "C-A", "loanNo": "L-A", "principal": 1000, "totalRepayment": 1000, "status": "Active"}
	call("POST", "/api/loans", tokenA, loan, 201)
	portalA := decodeSaaS[map[string]any](t, call("POST", "/api/portal/login", "", map[string]string{"identifier": "SHARED-NIC", "password": "Borrower-test-123", "organizationId": a["organizationId"]}, 200))["token"].(string)
	portalB := decodeSaaS[map[string]any](t, call("POST", "/api/portal/login", "", map[string]string{"identifier": "SHARED-NIC", "password": "Borrower-test-123", "organizationId": b["organizationId"]}, 200))["token"].(string)
	run("tenant_and_customer_portal_isolation", func(t *testing.T) {
		call("POST", "/api/portal/login", "", map[string]string{"identifier": "SHARED-NIC", "password": "Borrower-test-123"}, 401)
		call("GET", "/api/customers/C-A", tokenB, nil, 404)
		call("PUT", "/api/customers/C-A", tokenB, map[string]string{"name": "Attacker"}, 404)
		call("GET", "/api/loans/L-A", tokenB, nil, 404)
		call("POST", "/api/loans", tokenB, map[string]any{"customerId": "C-A", "principal": 1}, 400)
		call("POST", "/api/customers/C-A/documents", tokenB, map[string]string{"title": "bad", "fileUrl": "data:abc"}, 404)
		if got := string(bytes.TrimSpace(call("GET", "/api/loans?customerId=C-A", tokenB, nil, 200))); got != "[]" {
			t.Fatal("cross-tenant list leaked")
		}
		call("GET", "/api/billing/subscription", portalA, nil, 403)
		call("GET", "/api/billing/payments", portalA, nil, 403)
		p := decodeSaaS[map[string]any](t, call("GET", "/api/portal/me", portalB, nil, 200))
		if len(p["loans"].([]any)) != 0 {
			t.Fatal("portal leaked lender A loans")
		}
		call("POST", "/api/portal/online-payments", portalB, map[string]any{"loanId": "L-A", "amount": 1}, 400)
		scoped, release, err := root.Tenant(context.Background(), a["organizationId"])
		if err != nil {
			t.Fatal(err)
		}
		defer release()
		var count int
		if err = scoped.QueryRow(`SELECT count(*) FROM customers WHERE organization_id=$1`, b["organizationId"]).Scan(&count); err != nil || count != 0 {
			t.Fatal("RLS read bypass", err)
		}
		if _, err = scoped.Exec(`UPDATE organizations SET trial_started_at=NOW() WHERE id=$1`, a["organizationId"]); err == nil {
			t.Fatal("tenant role could change trial")
		}
		if _, err = scoped.Exec(`INSERT INTO customers(id,organization_id,name,nic,phone,address,town,district) VALUES('C-X',$1,'X','X','1','','','')`, b["organizationId"]); err == nil {
			t.Fatal("RLS cross-tenant insert accepted")
		}
		call("PUT", "/api/settings", tokenA, map[string]string{"systemName": "Lender A settings"}, 200)
		if strings.Contains(string(call("GET", "/api/settings", tokenB, nil, 200)), "Lender A settings") {
			t.Fatal("settings leaked")
		}
		call("POST", "/api/users", tokenB, map[string]any{"id": "owner-a@test.local", "name": "Conflicting identifier", "email": "other-b@test.local", "password": "Officer-test-123", "role": "Staff"}, 200)
		call("POST", "/api/auth/login", "", map[string]string{"email": "owner-a@test.local", "password": "SaaS-test-password-123"}, 200)
	})
	call("POST", "/api/users", tokenA, map[string]any{"id": "STAFF-A", "name": "Officer", "email": "officer@test.local", "password": "Officer-test-123", "role": "Staff", "permissions": map[string]bool{"recordRepayments": true}}, 200)
	staff := decodeSaaS[map[string]any](t, call("POST", "/api/auth/login", "", map[string]string{"email": "officer@test.local", "password": "Officer-test-123"}, 200))["token"].(string)
	hash, _ := bcrypt.GenerateFromPassword([]byte("Platform-test-123"), bcrypt.MinCost)
	platformID := uuid.NewString()
	if _, err = db.Exec(`INSERT INTO platform_administrators(id,email,name,password_hash) VALUES($1,'platform@test.local','Platform',$2)`, platformID, string(hash)); err != nil {
		t.Fatal(err)
	}
	platform := decodeSaaS[map[string]string](t, call("POST", "/api/platform/login", "", map[string]string{"email": "platform@test.local", "password": "Platform-test-123"}, 200))["token"]
	run("independent_roles_and_platform_access", func(t *testing.T) {
		call("GET", "/api/billing/subscription", staff, nil, 403)
		call("POST", "/api/billing/cancel", staff, nil, 403)
		call("GET", "/api/platform/organizations", tokenA, nil, 403)
		call("GET", "/api/platform/subscriptions", tokenA, nil, 403)
		call("GET", "/api/customers", platform, nil, 403)
		fake, _ := middleware.GenerateToken(a["userId"], "owner-a@test.local", "PlatformAdmin", cfg)
		call("GET", "/api/platform/plans", fake, nil, 403)
		call("GET", "/api/platform/organizations", platform, nil, 200)
		call("GET", "/api/platform/subscriptions", platform, nil, 200)
		call("POST", "/api/loans", staff, loan, 403)
	})
	monthID := "00000000-0000-0000-0000-000000000008"
	yearID := "00000000-0000-0000-0000-000000000009"
	for _, p := range []map[string]any{{"name": "Monthly", "billingInterval": "month", "amountMinor": 12345, "currency": "LKR", "currencyExponent": 2, "active": true}, {"name": "Yearly", "billingInterval": "year", "amountMinor": 98765, "currency": "LKR", "currencyExponent": 2, "active": true}} {
		id := monthID
		if p["billingInterval"] == "year" {
			id = yearID
		}
		call("PUT", "/api/platform/plans/"+id, platform, p, 200)
	}
	run("onepay_claim_survives_concurrent_requests_and_uncertain_outcomes", func(t *testing.T) {
		for _, fail := range []bool{false, true} {
			org := reg("OnePay fixture", fmt.Sprintf("onepay-%v@test.local", fail))
			provider := &onePayClaimFixture{fail: fail}
			repo := repository.NewBillingRepository(root)
			var wg sync.WaitGroup
			for i := 0; i < 8; i++ {
				wg.Add(1)
				go func() {
					defer wg.Done()
					_, _ = repo.Checkout(context.Background(), org["organizationId"], monthID, uuid.NewString(), provider)
				}()
			}
			wg.Wait()
			_, _ = repo.Checkout(context.Background(), org["organizationId"], monthID, uuid.NewString(), provider)
			if provider.calls.Load() != 1 {
				t.Fatalf("created %d external checkouts", provider.calls.Load())
			}
			var count int
			if err := db.QueryRow(`SELECT count(*) FROM subscription_payments WHERE organization_id=$1 AND checkout_started_at IS NOT NULL AND status='pending'`, org["organizationId"]).Scan(&count); err != nil || count != 1 {
				t.Fatalf("saved claim lost: %d %v", count, err)
			}
		}
	})
	run("expired_trial_preserves_recordkeeping", func(t *testing.T) {
		// Explicit maintenance fixture in this disposable schema; public/runtime roles
		// cannot alter trial timestamps. Both original timestamps move together.
		_, err = db.Exec(`ALTER TABLE organizations DISABLE TRIGGER organizations_trial_immutable; ALTER TABLE subscriptions DISABLE TRIGGER subscriptions_trial_immutable; UPDATE organizations SET trial_started_at=NOW()-INTERVAL '8 days',trial_ends_at=NOW()-INTERVAL '1 day' WHERE id='` + a["organizationId"] + `'; UPDATE subscriptions SET trial_start=NOW()-INTERVAL '8 days',trial_end=NOW()-INTERVAL '1 day' WHERE organization_id='` + a["organizationId"] + `'; ALTER TABLE organizations ENABLE TRIGGER organizations_trial_immutable; ALTER TABLE subscriptions ENABLE TRIGGER subscriptions_trial_immutable`)
		if err != nil {
			t.Fatal(err)
		}
		s := snapshot(tokenA)
		if s.Subscription.Status != "expired" || s.CanCreate {
			t.Fatal("trial did not expire")
		}
		call("POST", "/api/loans", tokenA, loan, 402)
		call("POST", "/api/customers", tokenA, map[string]string{"name": "New"}, 402)
		call("POST", "/api/loans", staff, loan, 403)
		scoped, release, err := root.Tenant(context.Background(), a["organizationId"])
		if err != nil {
			t.Fatal(err)
		}
		_, err = scoped.Exec(`INSERT INTO loans(id,customer_id,loan_no,principal,total_repayment) VALUES('BYPASS','C-A','BYPASS',1,1)`)
		release()
		if err == nil {
			t.Fatal("expired direct repository insert bypassed database subscription guard")
		}
		call("GET", "/api/loans", tokenA, nil, 200)
		call("GET", "/api/payments", tokenA, nil, 200)
		call("POST", "/api/payments", staff, map[string]any{"id": "P-A", "loanId": "L-A", "amount": 10}, 201)
		call("POST", "/api/portal/online-payments", portalA, map[string]any{"id": "SLIP-A", "loanId": "L-A", "customerId": "C-A", "amount": 10, "bankName": "Test Bank", "slipUrl": "data:abc", "paymentDate": "2026-10-29"}, 201)
		call("PATCH", "/api/online-payments/SLIP-A/approve", staff, map[string]string{"notes": "Essential repayment"}, 200)
		if strings.Contains(string(call("GET", "/api/payments?loanId=L-A", tokenB, nil, 200)), "P-A") {
			t.Fatal("cross-tenant repayment list leaked")
		}
		call("PUT", "/api/payments/P-A", tokenB, map[string]int{"amount": 2}, 404)
		for i := 0; i < 3; i++ {
			snapshot(tokenA)
		}
		var notices int
		if err = db.QueryRow(`SELECT count(*) FROM billing_notifications WHERE organization_id=$1 AND event_type='trial_expired'`, a["organizationId"]).Scan(&notices); err != nil || notices != 1 {
			t.Fatal("duplicate expiry notification", err, notices)
		}
	})
	checkout := func(token, plan, key string) billing.Payment {
		return decodeSaaS[billing.Payment](t, call("POST", "/api/billing/checkout", token, map[string]string{"planId": plan, "idempotencyKey": key}, 200))
	}
	provider := &billing.TestProvider{Secret: cfg.BillingTestSecret}
	event := func(p billing.Payment, id, status string) billing.VerifiedEvent {
		return billing.VerifiedEvent{ID: id, PaymentID: p.ID, OrganizationID: p.OrganizationID, SubscriptionID: p.SubscriptionID, SessionID: *p.SessionID, TransactionID: "tx_" + p.ID, AmountMinor: p.AmountMinor, Currency: p.Currency, Status: status}
	}
	webhook := func(e billing.VerifiedEvent, valid bool) *httptest.ResponseRecorder {
		payload, _ := json.Marshal(e)
		req := httptest.NewRequest("POST", "/api/billing/webhooks/test", bytes.NewReader(payload))
		req.Header = provider.Headers(payload, time.Now())
		if !valid {
			req.Header.Set("X-Billing-Signature", "bad")
		}
		res := httptest.NewRecorder()
		router.ServeHTTP(res, req)
		return res
	}
	var monthly billing.Payment
	run("repeated_and_concurrent_checkout_attempts", func(t *testing.T) {
		key := uuid.NewString()
		monthly = checkout(tokenA, monthID, key)
		again := checkout(tokenA, monthID, key)
		if monthly.ID != again.ID {
			t.Fatal("repeated checkout created another attempt")
		}
		results := make(chan *httptest.ResponseRecorder, 4)
		var wg sync.WaitGroup
		for i := 0; i < 4; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				results <- request("POST", "/api/billing/checkout", tokenA, map[string]string{"planId": monthID, "idempotencyKey": uuid.NewString()})
			}()
		}
		wg.Wait()
		close(results)
		for res := range results {
			if res.Code != 200 {
				t.Fatal(res.Code, res.Body.String())
			}
			p := decodeSaaS[billing.Payment](t, res.Body.Bytes())
			if p.ID != monthly.ID {
				t.Fatal("concurrent checkout created another attempt")
			}
		}
		call("POST", "/api/billing/checkout", tokenA, map[string]string{"planId": yearID, "idempotencyKey": uuid.NewString()}, 400)
		call("GET", "/api/billing/payments/"+monthly.ID, tokenB, nil, 404)
		call("GET", "/api/billing/payments/"+monthly.ID+"/receipt", tokenB, nil, 404)
		call("GET", "/api/billing/payments/"+monthly.ID+"/receipt", tokenA, nil, 409)
		if snapshot(tokenA).Subscription.Status == "active" {
			t.Fatal("checkout activated subscription before confirmation")
		}
	})
	var firstEnd time.Time
	run("verified_monthly_payment_and_concurrent_webhooks", func(t *testing.T) {
		e := event(monthly, "monthly-success", "succeeded")
		if res := webhook(e, false); res.Code != 401 {
			t.Fatal("unsigned webhook accepted")
		}
		wrong := e
		wrong.ID = "wrong-amount"
		wrong.AmountMinor++
		if res := webhook(wrong, true); res.Code != 400 {
			t.Fatal("wrong amount accepted", res.Code, res.Body.String())
		}
		wrong = e
		wrong.ID = "wrong-currency"
		wrong.Currency = "USD"
		if res := webhook(wrong, true); res.Code != 400 {
			t.Fatal("wrong currency accepted")
		}
		wrong = e
		wrong.ID = "wrong-org"
		wrong.OrganizationID = b["organizationId"]
		if res := webhook(wrong, true); res.Code != 404 {
			t.Fatal("wrong organization accepted")
		}
		results := make(chan *httptest.ResponseRecorder, 6)
		var wg sync.WaitGroup
		for i := 0; i < 6; i++ {
			wg.Add(1)
			go func() { defer wg.Done(); results <- webhook(e, true) }()
		}
		wg.Wait()
		close(results)
		for res := range results {
			if res.Code != 200 {
				t.Fatal(res.Code, res.Body.String())
			}
		}
		s := snapshot(tokenA)
		if s.Subscription.Status != "active" || !s.CanCreate {
			t.Fatal("verified monthly payment did not activate")
		}
		paid := decodeSaaS[billing.Payment](t, call("GET", "/api/billing/payments/"+monthly.ID, tokenA, nil, 200))
		if !billing.AddCalendarMonths(*paid.PeriodStart, 1).Equal(*paid.PeriodEnd) {
			t.Fatal("wrong monthly period")
		}
		firstEnd = *paid.PeriodEnd
		e.ID = "different-event-same-payment"
		if res := webhook(e, true); res.Code != 200 {
			t.Fatal(res.Code)
		}
		if !snapshot(tokenA).Subscription.PeriodEnd.Equal(firstEnd) {
			t.Fatal("duplicate extended subscription")
		}
		mismatch := e
		mismatch.TransactionID = "different-completed-transaction"
		mismatch.ID = "conflicting-transaction"
		if res := webhook(mismatch, true); res.Code != 400 {
			t.Fatal("completed checkout accepted a different transaction")
		}
		mismatch = e
		mismatch.Status = "failed"
		if res := webhook(mismatch, true); res.Code != 409 {
			t.Fatal("reused event ID with different payload accepted")
		}
		e.ID = "late-failure"
		e.Status = "failed"
		if res := webhook(e, true); res.Code != 200 {
			t.Fatal(res.Code)
		}
		if snapshot(tokenA).Subscription.Status != "active" {
			t.Fatal("late failure revoked paid access")
		}
		call("GET", "/api/billing/payments/"+monthly.ID+"/receipt", tokenA, nil, 200)
		var count int
		if err = db.QueryRow(`SELECT count(*) FROM billing_notifications WHERE event_key=$1`, monthly.ID+":succeeded").Scan(&count); err != nil || count != 1 {
			t.Fatal("duplicate payment notification")
		}
	})
	run("yearly_activation_and_manual_renewal", func(t *testing.T) {
		p := checkout(tokenB, yearID, uuid.NewString())
		if res := webhook(event(p, "yearly", "succeeded"), true); res.Code != 200 {
			t.Fatal(res.Code, res.Body.String())
		}
		paid := decodeSaaS[billing.Payment](t, call("GET", "/api/billing/payments/"+p.ID, tokenB, nil, 200))
		if !billing.AddCalendarMonths(*paid.PeriodStart, 12).Equal(*paid.PeriodEnd) {
			t.Fatal("yearly period not twelve months")
		}
		renewal := decodeSaaS[billing.Payment](t, call("POST", "/api/billing/renew", tokenA, map[string]string{"planId": monthID, "idempotencyKey": uuid.NewString()}, 200))
		if res := webhook(event(renewal, "renewal", "succeeded"), true); res.Code != 200 {
			t.Fatal(res.Code, res.Body.String())
		}
		if !snapshot(tokenA).Subscription.PeriodEnd.Equal(billing.AddCalendarMonths(firstEnd, 1)) {
			t.Fatal("renewal lost existing paid time")
		}
	})
	run("failed_payment_cancellation_and_late_notifications", func(t *testing.T) {
		old := snapshot(tokenA)
		p := checkout(tokenA, monthID, uuid.NewString())
		if res := webhook(event(p, "failed-payment", "failed"), true); res.Code != 200 {
			t.Fatal(res.Code, res.Body.String())
		}
		if !snapshot(tokenA).Subscription.PeriodEnd.Equal(*old.Subscription.PeriodEnd) {
			t.Fatal("failed payment changed paid period")
		}
		// A later canonical success can arrive after failure and is credited once.
		if res := webhook(event(p, "delayed-success", "succeeded"), true); res.Code != 200 {
			t.Fatal(res.Code, res.Body.String())
		}
		beforeCancel := snapshot(tokenA)
		canceled := decodeSaaS[billing.Snapshot](t, call("POST", "/api/billing/cancel", tokenA, nil, 200))
		if !canceled.Subscription.CancelAtPeriodEnd || !canceled.CanCreate || !canceled.Subscription.PeriodEnd.Equal(*beforeCancel.Subscription.PeriodEnd) {
			t.Fatal("cancel removed paid access")
		}
		call("POST", "/api/billing/cancel", tokenA, nil, 200)
		// Expire the paid period with a maintenance-only fixture; trial dates stay fixed.
		if _, err = db.Exec(`UPDATE subscriptions SET current_period_start=NOW()-INTERVAL '2 days',current_period_end=NOW()-INTERVAL '1 day' WHERE organization_id=$1`, a["organizationId"]); err != nil {
			t.Fatal(err)
		}
		if snapshot(tokenA).Subscription.Status != "canceled" {
			t.Fatal("period-end cancellation failed")
		}
		if _, err = db.Exec(`UPDATE subscriptions SET status='trialing' WHERE organization_id=$1`, a["organizationId"]); err == nil {
			t.Fatal("trial restarted after payment/cancel")
		}
	})
	run("development_adapter_disabled_in_production", func(t *testing.T) {
		prod := newRouter(root, &config.Config{Env: "production", JWTSecret: cfg.JWTSecret, BillingProvider: "test", BillingTestSecret: cfg.BillingTestSecret})
		for _, path := range []string{"/api/billing/payments/" + monthly.ID + "/test-complete", "/api/billing/webhooks/test"} {
			req := httptest.NewRequest("POST", path, strings.NewReader(`{"status":"succeeded"}`))
			req.Header.Set("Authorization", "Bearer "+tokenA)
			res := httptest.NewRecorder()
			prod.ServeHTTP(res, req)
			if res.Code != 404 {
				t.Fatal("test endpoint exposed in production", res.Code)
			}
		}
		req := httptest.NewRequest("POST", "/api/billing/checkout", strings.NewReader(`{}`))
		req.Header.Set("Authorization", "Bearer "+tokenA)
		res := httptest.NewRecorder()
		prod.ServeHTTP(res, req)
		if res.Code != 503 {
			t.Fatal("unconfigured live checkout accepted")
		}
	})
	run("uncertain_checkout_is_saved_and_resumed", func(t *testing.T) {
		repo := repository.NewBillingRepository(root)
		key := uuid.NewString()
		p, err := repo.Checkout(context.Background(), a["organizationId"], monthID, key, &uncertainCheckoutProvider{})
		if err == nil || p.ID == "" {
			t.Fatal("uncertain provider call was not retained")
		}
		saved, err := repo.Payment(a["organizationId"], p.ID)
		if err != nil || saved.Status != "pending" {
			t.Fatal("saved uncertain attempt missing", err)
		}
		resumed := checkout(tokenA, monthID, key)
		if resumed.ID != p.ID {
			t.Fatal("retry replaced an uncertain attempt")
		}
		if res := webhook(event(resumed, "uncertain-eventually-canceled", "canceled"), true); res.Code != 200 {
			t.Fatal(res.Code, res.Body.String())
		}
	})
	run("platform_suspension_preserves_original_paid_dates", func(t *testing.T) {
		before := snapshot(tokenB)
		path := "/api/platform/organizations/" + b["organizationId"] + "/status"
		call("PATCH", path, tokenB, map[string]string{"status": "suspended"}, 403)
		call("PATCH", path, platform, map[string]string{"status": "suspended"}, 200)
		held := snapshot(tokenB)
		if held.CanCreate || held.Subscription.Status != "suspended" {
			t.Fatal("suspension not enforced")
		}
		all := decodeSaaS[[]map[string]any](t, call("GET", "/api/platform/subscriptions", platform, nil, 200))
		found := false
		for _, s := range all {
			if s["organizationId"] == b["organizationId"] {
				found = true
				if s["status"] != "suspended" {
					t.Fatal("platform listed a suspended organization as active")
				}
			}
		}
		if !found {
			t.Fatal("platform subscription missing")
		}
		call("POST", "/api/loans", tokenB, map[string]any{"customerId": "C-B", "principal": 1}, 402)
		call("GET", "/api/customers", tokenB, nil, 200)
		call("PATCH", path, platform, map[string]string{"status": "active"}, 200)
		after := snapshot(tokenB)
		if !after.CanCreate || !after.Subscription.PeriodEnd.Equal(*before.Subscription.PeriodEnd) || !after.Subscription.TrialEnd.Equal(*before.Subscription.TrialEnd) {
			t.Fatal("restoring organization reset billing dates")
		}
	})
	run("original_email_cannot_reclaim_trial_after_contact_change", func(t *testing.T) {
		call("PUT", "/api/users/"+a["userId"], tokenA, map[string]string{"email": "changed-a@test.local"}, 200)
		call("POST", "/api/organizations/register", "", map[string]string{"organizationName": "Reused account", "adminName": "Owner", "email": "owner-a@test.local", "phone": "0771234567", "password": "SaaS-test-password-123", "confirmPassword": "SaaS-test-password-123"}, 409)
	})
	run("maintenance_expiry_and_reminders_without_frontend_requests", func(t *testing.T) {
		fixture := func(ageDays int) string {
			t.Helper()
			org, sub := uuid.NewString(), uuid.NewString()
			tx, err := db.Begin()
			if err != nil {
				t.Fatal(err)
			}
			defer tx.Rollback()
			_, err = tx.Exec(`INSERT INTO organizations(id,name,email,trial_started_at,trial_ends_at) VALUES($1,'Worker fixture','fixture@test.local',NOW()-$2::int*INTERVAL '1 day',NOW()+(7-$2::int)*INTERVAL '1 day')`, org, ageDays)
			if err != nil {
				t.Fatal(err)
			}
			_, err = tx.Exec(`INSERT INTO subscriptions(id,organization_id,plan_id,status,trial_start,trial_end) SELECT $1,id,'00000000-0000-0000-0000-000000000007','trialing',trial_started_at,trial_ends_at FROM organizations WHERE id=$2`, sub, org)
			if err != nil {
				t.Fatal(err)
			}
			if err = tx.Commit(); err != nil {
				t.Fatal(err)
			}
			return org
		}
		due, soon := fixture(8), fixture(5)
		repo := repository.NewBillingRepository(root)
		for i := 0; i < 2; i++ {
			if err = repo.Sweep(context.Background()); err != nil {
				t.Fatal(err)
			}
		}
		var state string
		if err = db.QueryRow(`SELECT status FROM subscriptions WHERE organization_id=$1`, due).Scan(&state); err != nil || state != "expired" {
			t.Fatal("worker did not expire the original trial", err)
		}
		for org, kind := range map[string]string{due: "trial_expired", soon: "trial_ending_soon"} {
			var count int
			if err = db.QueryRow(`SELECT count(*) FROM billing_notifications WHERE organization_id=$1 AND event_type=$2`, org, kind).Scan(&count); err != nil || count != 1 {
				t.Fatal("worker reminders were missing or duplicated", err, count)
			}
		}
	})
	if err = repository.NewBillingRepository(root).Sweep(context.Background()); err != nil {
		t.Fatal(err)
	}
	t.Logf("%d authenticated/public API checks plus RLS, migration preservation and concurrent webhook assertions", calls.Load())
}
