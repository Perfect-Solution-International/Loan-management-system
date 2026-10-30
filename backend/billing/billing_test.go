package billing

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
	"time"
)

func TestCalendarBillingPeriods(t *testing.T) {
	for _, tc := range []struct {
		start  string
		months int
		want   string
	}{{"2026-01-31T14:03:00Z", 1, "2026-02-28T14:03:00Z"}, {"2024-01-31T14:03:00Z", 1, "2024-02-29T14:03:00Z"}, {"2024-02-29T14:03:00Z", 12, "2025-02-28T14:03:00Z"}, {"2026-12-15T14:03:00Z", 1, "2027-01-15T14:03:00Z"}} {
		start, _ := time.Parse(time.RFC3339, tc.start)
		if got := AddCalendarMonths(start, tc.months).Format(time.RFC3339); got != tc.want {
			t.Errorf("%s + %d: got %s want %s", tc.start, tc.months, got, tc.want)
		}
	}
}
func TestExpiryBoundaryAndTerminalStates(t *testing.T) {
	end := time.Date(2026, 10, 29, 0, 0, 0, 0, time.UTC)
	for _, status := range []string{"trialing", "active"} {
		s := Subscription{Status: status, TrialEnd: &end, PeriodEnd: &end}
		if EffectiveStatus(s, end.Add(-time.Nanosecond)) != status {
			t.Fatal("expired before stored boundary")
		}
		if EffectiveStatus(s, end) != "expired" {
			t.Fatal("must expire at exact stored boundary")
		}
	}
	for _, status := range []string{"suspended", "canceled", "past_due", "expired"} {
		if EffectiveStatus(Subscription{Status: status, PeriodEnd: &end}, end.Add(-time.Hour)) != status {
			t.Fatal("terminal/held state was revived")
		}
	}
	if EffectiveStatus(Subscription{Status: "active", PeriodEnd: &end, CancelAtPeriodEnd: true}, end) != "canceled" {
		t.Fatal("scheduled cancellation not applied")
	}
}
func TestAuthenticatedTestProvider(t *testing.T) {
	p := &TestProvider{Secret: strings.Repeat("s", 32)}
	body, _ := json.Marshal(VerifiedEvent{ID: "event", PaymentID: "payment", TransactionID: "tx", Status: "succeeded"})
	h := p.Headers(body, time.Now())
	if _, err := p.Verify(context.Background(), h, body); err != nil {
		t.Fatal(err)
	}
	if _, err := p.Verify(context.Background(), h, append(body, ' ')); err == nil {
		t.Fatal("modified body accepted")
	}
	if _, err := p.Verify(context.Background(), p.Headers(body, time.Now().Add(-6*time.Minute)), body); err == nil {
		t.Fatal("old signature accepted")
	}
	h.Set("X-Billing-Signature", "invalid")
	if _, err := p.Verify(context.Background(), h, body); err == nil {
		t.Fatal("invalid signature accepted")
	}
}
