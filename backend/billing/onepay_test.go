package billing

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestOnePayConfiguredAPIBase(t *testing.T) {
	called := false
	server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		if r.URL.Path != "/v3/transaction/status/" {
			t.Errorf("wrong endpoint: %s", r.URL.Path)
		}
		w.Write([]byte(`{"status":false}`))
	}))
	defer server.Close()
	p := &OnePayProvider{AppID: "fixture", HashSalt: "fixture", ReturnURL: "https://frontend.example/dashboard/billing/success", APIBase: server.URL + "/", client: server.Client()}
	if err := p.ValidateConfig(); err != nil {
		t.Fatal(err)
	}
	var response map[string]any
	if err := p.post(context.Background(), "/v3/transaction/status/", map[string]string{"app_id": "fixture"}, &response); err != nil {
		t.Fatal(err)
	}
	if !called {
		t.Fatal("configured API base was ignored")
	}
	for _, invalid := range []string{"http://api.onepay.lk", "https://api.onepay.lk/path", "https://user:password@api.onepay.lk", "https://api.onepay.lk?key=value"} {
		p.APIBase = invalid
		if p.ValidateConfig() == nil {
			t.Fatalf("invalid API base accepted: %s", invalid)
		}
	}
}

func TestOnePayContract(t *testing.T) {
	session := "ONEPAY123"
	payment := Payment{ID: "payment-1", OrganizationID: "org-1", SubscriptionID: "sub-1", AmountMinor: 12345, Currency: "LKR", CurrencyExponent: 2, Provider: "onepay", SessionID: &session}
	provider := &OnePayProvider{AppID: "app", HashSalt: "salt", ReturnURL: "https://lender.example/dashboard/billing/success"}
	provider.Contact = func(context.Context, string) (BillingContact, error) {
		return BillingContact{Name: "Owner Name", Email: "owner@example.com", Phone: "+94771234567"}, nil
	}
	provider.Lookup = func(_ context.Context, id string) (Payment, error) {
		if id != session {
			return Payment{}, errors.New("unknown")
		}
		return payment, nil
	}
	response := `{"status":true,"ipg_transaction_id":"ONEPAY123","amount":123.45,"currency":"LKR"}`
	calls := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls++
		if r.Method != "POST" || r.Header.Get("Content-Type") != "application/json" {
			t.Error("invalid HTTP request")
		}
		var in map[string]json.RawMessage
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			t.Error(err)
		}
		if string(in["app_id"]) != `"app"` {
			t.Error("missing app id")
		}
		if r.URL.Path == "/v3/checkout/link/" {
			sum := sha256.Sum256([]byte("appLKR123.45salt"))
			if string(in["amount"]) != "123.45" || string(in["hash"]) != `"`+hex.EncodeToString(sum[:])+`"` {
				t.Error("incorrect amount or signature")
			}
			if strings.Contains(string(in["transaction_redirect_url"]), "payment=payment-1") == false {
				t.Error("missing local reference")
			}
			w.Write([]byte(`{"ipg_transaction_id":"ONEPAY123","redirect_url":"https://checkout.onepay.lk/pay"}`))
			return
		}
		if r.URL.Path != "/v3/transaction/status/" || string(in["onepay_transaction_id"]) != `"ONEPAY123"` {
			t.Error("invalid status request")
		}
		w.Write([]byte(response))
	}))
	defer server.Close()
	provider.baseURL = server.URL
	provider.client = server.Client()
	id, link, err := provider.Create(context.Background(), payment)
	if err != nil || id != session || link != "https://checkout.onepay.lk/pay" {
		t.Fatalf("create: %s %s %v", id, link, err)
	}
	callback := []byte(`{"transaction_id":"ONEPAY123","status":0,"additional_data":"attacker-payment"}`)
	event, err := provider.Verify(context.Background(), nil, callback)
	if err != nil || event.PaymentID != payment.ID || event.Status != "succeeded" {
		t.Fatalf("verify: %+v %v", event, err)
	}
	for _, bad := range []string{
		`{"status":true,"ipg_transaction_id":"wrong","amount":123.45,"currency":"LKR"}`,
		`{"status":true,"ipg_transaction_id":"ONEPAY123","amount":123.451,"currency":"LKR"}`,
		`{"status":true,"ipg_transaction_id":"ONEPAY123","amount":123.45,"currency":"USD"}`,
		`{"status":1,"ipg_transaction_id":"ONEPAY123","amount":123.45,"currency":"LKR"}`,
		`{"ipg_transaction_id":"ONEPAY123","amount":123.45,"currency":"LKR"}`,
	} {
		response = bad
		if _, err := provider.Verify(context.Background(), nil, callback); err == nil {
			t.Errorf("accepted %s", bad)
		}
	}
	response = `{"status":false,"ipg_transaction_id":"ONEPAY123","amount":123.45,"currency":"LKR"}`
	if _, err = provider.Verify(context.Background(), nil, callback); !errors.Is(err, ErrPaymentPending) {
		t.Fatalf("false must remain pending: %v", err)
	}
	before := calls
	if _, err = provider.Verify(context.Background(), nil, []byte(`{"transaction_id":"unknown"}`)); err == nil || calls != before {
		t.Fatal("unknown session reached provider")
	}
	provider.ReturnURL = "http://localhost/return"
	if _, _, err = provider.Create(context.Background(), payment); err == nil {
		t.Fatal("insecure return URL accepted")
	}

	// Verify missing config detection
	incomplete := &OnePayProvider{}
	if err := incomplete.ValidateConfig(); err == nil || !strings.Contains(err.Error(), "ONEPAY_APP_ID") {
		t.Fatalf("expected missing config error, got %v", err)
	}

	// Verify Authorization header transmission
	var capturedAuth string
	authServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedAuth = r.Header.Get("Authorization")
		w.Write([]byte(`{"ipg_transaction_id":"ONEPAY_AUTH","redirect_url":"https://checkout.onepay.lk/pay"}`))
	}))
	defer authServer.Close()

	authProvider := &OnePayProvider{
		AppID:     "app-id",
		HashSalt:  "hash-salt",
		ReturnURL: "https://lender.example/dashboard/billing/success",
		AppToken:  "custom-token-123",
		baseURL:   authServer.URL,
		client:    authServer.Client(),
		Contact: func(context.Context, string) (BillingContact, error) {
			return BillingContact{Name: "Owner Name", Email: "owner@example.com", Phone: "+94771234567"}, nil
		},
	}
	if _, _, err := authProvider.Create(context.Background(), payment); err != nil {
		t.Fatalf("failed auth provider create: %v", err)
	}
	if capturedAuth != "custom-token-123" {
		t.Fatalf("expected Authorization header 'custom-token-123', got '%s'", capturedAuth)
	}
}
