package billing

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/big"
	"net"
	"net/http"
	"net/mail"
	"net/url"
	"regexp"
	"strings"
	"time"
)

var ErrPaymentPending = errors.New("payment is awaiting confirmation from OnePay")

type BillingContact struct{ Name, Email, Phone string }

// OnePay's unsigned callback is only a trigger. The stored session and the
// server-to-server status response are the payment evidence.
type OnePayProvider struct {
	AppID, HashSalt, ReturnURL, AppToken string
	APIBase                              string
	Contact                              func(context.Context, string) (BillingContact, error)
	Lookup                               func(context.Context, string) (Payment, error)
	client                               *http.Client
	baseURL                              string
}

func (*OnePayProvider) Name() string    { return "onepay" }
func (*OnePayProvider) Recurring() bool { return false }
func (p *OnePayProvider) ValidateConfig() error {
	if p.APIBase != "" {
		api, err := url.Parse(p.APIBase)
		if err != nil || api.Scheme != "https" || api.Hostname() == "" || api.User != nil || api.RawQuery != "" || api.Fragment != "" || (api.Path != "" && api.Path != "/") {
			return errors.New("OnePay configuration: ONEPAY_API_BASE must be an HTTPS API origin, for example https://api.onepay.lk")
		}
	}
	if strings.TrimSpace(p.AppID) == "" {
		return errors.New("OnePay configuration: ONEPAY_APP_ID is missing")
	}
	if strings.TrimSpace(p.HashSalt) == "" {
		return errors.New("OnePay configuration: ONEPAY_HASH_SALT is missing")
	}
	u, err := url.Parse(p.ReturnURL)
	if err != nil || u.Scheme != "https" || u.Host == "" || u.User != nil || u.Fragment != "" {
		return errors.New("OnePay configuration: ONEPAY_RETURN_URL must be a public HTTPS billing return URL")
	}
	host := strings.ToLower(u.Hostname())
	if host == "localhost" || strings.HasSuffix(host, ".localhost") {
		return errors.New("OnePay configuration: ONEPAY_RETURN_URL points to localhost; configure a public HTTPS frontend or tunnel URL")
	}
	if ip := net.ParseIP(host); ip != nil && (ip.IsLoopback() || ip.IsPrivate() || ip.IsUnspecified()) {
		return errors.New("OnePay configuration: ONEPAY_RETURN_URL must use a public HTTPS address")
	}

	return nil
}
func (p *OnePayProvider) Validate(ctx context.Context, payment Payment) error {
	if err := p.ValidateConfig(); err != nil {
		return err
	}
	if payment.AmountMinor <= 0 || payment.CurrencyExponent != 2 || !strings.Contains("|LKR|USD|GBP|EUR|AUD|INR|CHF|CAD|SGD|", "|"+payment.Currency+"|") {
		return errors.New("OnePay requires a supported currency with two decimal places")
	}
	c, err := p.Contact(ctx, payment.OrganizationID)
	if err != nil {
		return errors.New("organization billing contact is unavailable")
	}
	address, err := mail.ParseAddress(c.Email)
	if err != nil || address.Address != c.Email || strings.TrimSpace(c.Name) == "" || !regexp.MustCompile(`^\+[1-9][0-9]{7,14}$`).MatchString(c.Phone) {
		return errors.New("organization billing contact requires a name, email and international phone number (for example +94771234567)")
	}
	return nil
}

func (p *OnePayProvider) post(ctx context.Context, path string, payload any, result any) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	base := p.baseURL
	if base == "" {
		base = strings.TrimRight(p.APIBase, "/")
	}
	if base == "" {
		base = "https://api.onepay.lk"
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, base+path, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if p.AppToken != "" {
		req.Header.Set("Authorization", p.AppToken)
	}
	client := p.client
	if client == nil {
		client = &http.Client{Timeout: 20 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	}
	res, err := client.Do(req)
	if err != nil {
		return errors.New("OnePay request could not be confirmed")
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK && res.StatusCode != http.StatusCreated {
		return fmt.Errorf("OnePay returned HTTP %d", res.StatusCode)
	}
	data, err := io.ReadAll(io.LimitReader(res.Body, 1024*1024+1))
	if err != nil || len(data) > 1024*1024 {
		return errors.New("invalid OnePay response")
	}
	// Accept the documented fields directly, or inside a data envelope.
	var envelope struct {
		Data json.RawMessage `json:"data"`
	}
	if json.Unmarshal(data, &envelope) != nil {
		return errors.New("invalid OnePay response")
	}
	if len(envelope.Data) > 0 && string(envelope.Data) != "null" {
		data = envelope.Data
	}
	if json.Unmarshal(data, result) != nil {
		return errors.New("invalid OnePay response")
	}
	return nil
}
func (p *OnePayProvider) Create(ctx context.Context, payment Payment) (string, string, error) {
	if err := p.Validate(ctx, payment); err != nil {
		return "", "", err
	}
	c, err := p.Contact(ctx, payment.OrganizationID)
	if err != nil {
		return "", "", err
	}
	names := strings.Fields(c.Name)
	first, last := names[0], names[0]
	if len(names) > 1 {
		last = strings.Join(names[1:], " ")
	}
	amount := fmt.Sprintf("%d.%02d", payment.AmountMinor/100, payment.AmountMinor%100)
	sum := sha256.Sum256([]byte(p.AppID + payment.Currency + amount + p.HashSalt))
	redirect, _ := url.Parse(p.ReturnURL)
	query := redirect.Query()
	query.Set("payment", payment.ID)
	redirect.RawQuery = query.Encode()
	reference := sha256.Sum256([]byte(payment.ID))
	input := map[string]any{"app_id": p.AppID, "amount": json.Number(amount), "currency": payment.Currency, "hash": hex.EncodeToString(sum[:]), "reference": strings.ToUpper(hex.EncodeToString(reference[:10])), "customer_first_name": first, "customer_last_name": last, "customer_phone_number": c.Phone, "customer_email": c.Email, "transaction_redirect_url": redirect.String(), "additionalData": payment.ID}
	var response struct {
		ID      string `json:"ipg_transaction_id"`
		URL     string `json:"redirect_url"`
		Gateway struct {
			URL string `json:"redirect_url"`
		} `json:"gateway"`
	}
	if err = p.post(ctx, "/v3/checkout/link/", input, &response); err != nil {
		return "", "", err
	}
	if response.URL == "" {
		response.URL = response.Gateway.URL
	}
	target, err := url.Parse(response.URL)
	if err != nil || target.Scheme != "https" || target.Host == "" || target.User != nil || response.ID == "" || len(response.ID) > 200 {
		return "", "", errors.New("OnePay returned an incomplete checkout; reconciliation required")
	}
	return response.ID, response.URL, nil
}
func (p *OnePayProvider) Verify(ctx context.Context, _ http.Header, body []byte) (VerifiedEvent, error) {
	var empty VerifiedEvent
	var callback struct {
		ID string `json:"transaction_id"`
	}
	if json.Unmarshal(body, &callback) != nil || callback.ID == "" || len(callback.ID) > 200 {
		return empty, errors.New("invalid OnePay callback")
	}
	payment, err := p.Lookup(ctx, callback.ID)
	if err != nil || payment.Provider != "onepay" || payment.SessionID == nil || *payment.SessionID != callback.ID {
		return empty, errors.New("OnePay checkout is not recorded yet")
	}
	var status struct {
		Success  *bool       `json:"status"`
		ID       string      `json:"ipg_transaction_id"`
		Amount   json.Number `json:"amount"`
		Currency string      `json:"currency"`
	}
	if err = p.post(ctx, "/v3/transaction/status/", map[string]string{"app_id": p.AppID, "onepay_transaction_id": callback.ID}, &status); err != nil {
		return empty, err
	}
	if status.Success == nil || status.ID != callback.ID || status.Currency != payment.Currency {
		return empty, errors.New("OnePay transaction does not match saved checkout")
	}
	amount, ok := new(big.Rat).SetString(string(status.Amount))
	if !ok {
		return empty, errors.New("invalid OnePay amount")
	}
	amount.Mul(amount, big.NewRat(100, 1))
	if payment.CurrencyExponent != 2 || !amount.IsInt() || !amount.Num().IsInt64() || amount.Num().Int64() != payment.AmountMinor {
		return empty, errors.New("OnePay amount does not match saved checkout")
	}
	// false does not document a terminal decline/cancellation. Keep the attempt.
	if !*status.Success {
		return empty, ErrPaymentPending
	}
	return VerifiedEvent{ID: callback.ID + ":succeeded", PaymentID: payment.ID, OrganizationID: payment.OrganizationID, SubscriptionID: payment.SubscriptionID, SessionID: callback.ID, TransactionID: callback.ID, AmountMinor: payment.AmountMinor, Currency: payment.Currency, Status: "succeeded"}, nil
}
