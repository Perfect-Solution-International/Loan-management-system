package billing

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"
)

// Live adapters must authenticate/retrieve canonical transaction details inside
// Verify and use approved hosted checkout APIs. Redirects are not payment evidence.
type Provider interface {
	Name() string
	Recurring() bool
	Create(context.Context, Payment) (sessionID, checkoutURL string, err error)
	Verify(context.Context, http.Header, []byte) (VerifiedEvent, error)
}
type VerifiedEvent struct {
	ID             string `json:"eventId"`
	PaymentID      string `json:"paymentId"`
	OrganizationID string `json:"organizationId"`
	SubscriptionID string `json:"subscriptionId"`
	SessionID      string `json:"sessionId"`
	TransactionID  string `json:"transactionId"`
	AmountMinor    int64  `json:"amountMinor"`
	Currency       string `json:"currency"`
	Status         string `json:"status"`
}
type TestProvider struct{ Secret string }

func (*TestProvider) Name() string    { return "test" }
func (*TestProvider) Recurring() bool { return false }
func (*TestProvider) Create(_ context.Context, p Payment) (string, string, error) {
	return "test_" + p.ID, "/dashboard/billing/test-checkout?payment=" + p.ID, nil
}
func (p *TestProvider) Headers(body []byte, now time.Time) http.Header {
	stamp := strconv.FormatInt(now.Unix(), 10)
	mac := hmac.New(sha256.New, []byte(p.Secret))
	mac.Write([]byte(stamp + "."))
	mac.Write(body)
	h := http.Header{}
	h.Set("X-Billing-Timestamp", stamp)
	h.Set("X-Billing-Signature", hex.EncodeToString(mac.Sum(nil)))
	return h
}
func (p *TestProvider) Verify(_ context.Context, h http.Header, body []byte) (VerifiedEvent, error) {
	var e VerifiedEvent
	stamp := h.Get("X-Billing-Timestamp")
	sec, err := strconv.ParseInt(stamp, 10, 64)
	if err != nil || time.Since(time.Unix(sec, 0)) > 5*time.Minute || time.Until(time.Unix(sec, 0)) > 5*time.Minute {
		return e, errors.New("invalid webhook timestamp")
	}
	expected := p.Headers(body, time.Unix(sec, 0)).Get("X-Billing-Signature")
	actual, err := hex.DecodeString(h.Get("X-Billing-Signature"))
	want, _ := hex.DecodeString(expected)
	if err != nil || !hmac.Equal(actual, want) {
		return e, errors.New("invalid webhook signature")
	}
	if err = json.Unmarshal(body, &e); err != nil {
		return e, err
	}
	if e.ID == "" || len(e.ID) > 200 || e.PaymentID == "" || e.TransactionID == "" || len(e.TransactionID) > 200 || (e.Status != "succeeded" && e.Status != "failed" && e.Status != "canceled") {
		return e, errors.New("invalid payment event")
	}
	return e, nil
}
