package billing

import "time"

type Plan struct {
	ID                    string   `json:"id"`
	Name                  string   `json:"name"`
	Interval              string   `json:"billingInterval"`
	AmountMinor           *int64   `json:"amountMinor"`
	Currency              *string  `json:"currency"`
	CurrencyExponent      int      `json:"currencyExponent"`
	TrialDuration         int      `json:"trialDuration"`
	Active                bool     `json:"active"`
	YearlyDiscountPercent *float64 `json:"yearlyDiscountPercent"`
}
type Subscription struct {
	ID                string     `json:"id"`
	OrganizationID    string     `json:"organizationId"`
	PlanID            *string    `json:"planId"`
	Status            string     `json:"status"`
	TrialStart        *time.Time `json:"trialStart"`
	TrialEnd          *time.Time `json:"trialEnd"`
	PeriodStart       *time.Time `json:"currentPeriodStart"`
	PeriodEnd         *time.Time `json:"currentPeriodEnd"`
	CancelAtPeriodEnd bool       `json:"cancelAtPeriodEnd"`
	CanceledAt        *time.Time `json:"canceledAt"`
}

func (s Subscription) UpdatedKey() string {
	if s.PeriodEnd != nil {
		return s.PeriodEnd.Format(time.RFC3339Nano)
	}
	if s.TrialEnd != nil {
		return s.TrialEnd.Format(time.RFC3339Nano)
	}
	return "initial"
}

type Payment struct {
	ID               string     `json:"id"`
	OrganizationID   string     `json:"organizationId"`
	SubscriptionID   string     `json:"subscriptionId"`
	PlanID           string     `json:"planId"`
	AmountMinor      int64      `json:"amountMinor"`
	Currency         string     `json:"currency"`
	CurrencyExponent int        `json:"currencyExponent"`
	Interval         string     `json:"billingInterval"`
	Provider         string     `json:"provider"`
	SessionID        *string    `json:"providerSessionId"`
	TransactionID    *string    `json:"providerTransactionId"`
	Status           string     `json:"status"`
	CheckoutURL      *string    `json:"checkoutUrl"`
	PaymentDate      *time.Time `json:"paymentDate"`
	ReceiptReference *string    `json:"receiptReference"`
	PeriodStart      *time.Time `json:"periodStart"`
	PeriodEnd        *time.Time `json:"periodEnd"`
	CreatedAt        time.Time  `json:"createdAt"`
}
type Snapshot struct {
	Subscription       Subscription `json:"subscription"`
	Plan               *Plan        `json:"plan"`
	ServerTime         time.Time    `json:"serverTime"`
	TrialDaysRemaining int          `json:"trialDaysRemaining"`
	CanCreate          bool         `json:"canCreate"`
	LegacyAccessUntil  *time.Time   `json:"legacyAccessUntil"`
	OrganizationName   string       `json:"organizationName"`
	OrganizationStatus string       `json:"organizationStatus"`
	PaymentsEnabled    bool         `json:"paymentsEnabled"`
	TestMode           bool         `json:"testMode"`
	Recurring          bool         `json:"recurring"`
}

func AddCalendarMonths(start time.Time, months int) time.Time {
	start = start.UTC()
	first := time.Date(start.Year(), start.Month()+time.Month(months), 1, start.Hour(), start.Minute(), start.Second(), start.Nanosecond(), time.UTC)
	last := time.Date(first.Year(), first.Month()+1, 0, 0, 0, 0, 0, time.UTC).Day()
	day := start.Day()
	if day > last {
		day = last
	}
	return time.Date(first.Year(), first.Month(), day, start.Hour(), start.Minute(), start.Second(), start.Nanosecond(), time.UTC)
}
func EffectiveStatus(s Subscription, now time.Time) string {
	if s.Status == "trialing" && (s.TrialEnd == nil || !now.Before(*s.TrialEnd)) {
		return "expired"
	}
	if s.Status == "active" && (s.PeriodEnd == nil || !now.Before(*s.PeriodEnd)) {
		if s.CancelAtPeriodEnd {
			return "canceled"
		}
		return "expired"
	}
	return s.Status
}
