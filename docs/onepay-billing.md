# OnePay subscription payments

This integration uses only the [OnePay API documentation](https://docs.onepay.lk/api-documentation), specifically its [redirection API](https://docs.onepay.lk/api-documentation/payment-api) and [authentication formula](https://docs.onepay.lk/api-documentation/authentication).

## Setup

1. From `backend`, run `go run ./cmd/migrate`. Migration 012 adds a durable checkout claim; existing subscription and payment records remain intact.
2. Set these backend environment variables, using credentials from the OnePay merchant dashboard:

   ```dotenv
   BILLING_PROVIDER=onepay
   ONEPAY_APP_ID=
   ONEPAY_HASH_SALT=
   ONEPAY_APP_TOKEN=
   ONEPAY_API_BASE=https://api.onepay.lk
   ONEPAY_RETURN_URL=https://YOUR-FRONTEND/dashboard/billing/success
   ```

3. Configure the APP callback URL in the OnePay portal as `https://YOUR-BACKEND/api/billing/webhooks/onepay`. Alternatively, the frontend proxy accepts `https://YOUR-FRONTEND/api/backend/billing/webhooks/onepay`.
4. Publish monthly/yearly plan prices in platform administration. This adapter supports the documented two-decimal currencies LKR, USD, GBP, EUR, AUD, INR, CHF, CAD and SGD; confirm merchant currency availability with OnePay. JPY is not enabled by this adapter because the existing billing amount model must retain its currency exponent.
5. Ensure the organization has a billing email, name and international phone number. Sri Lankan local phone numbers beginning with zero are normalized to +94. The migrated legacy organization has empty contact details and needs its verified billing contact configured before checkout.
6. Restart the backend. Use merchant sandbox credentials to validate checkout, callback delivery, and return-page verification before using live credentials.

Credentials stay on the backend. Blank `BILLING_PROVIDER` detects OnePay when credentials are present; use `BILLING_PROVIDER=disabled` to explicitly disable checkout. This implementation does not provision merchant credentials or change plan prices automatically.

## Payment behavior

Organization admins use the existing Subscribe / renew action. Checkout saves the payment before creating a OnePay session, signs the exact two-decimal JSON amount using SHA256(app_id + currency + amount + hash_salt), and redirects in the same browser tab. Monthly/yearly renewals use hosted checkout; automatic card charging is not enabled.

Callbacks are unsigned triggers. Only a transaction already linked to a saved OnePay checkout can be verified. The backend queries OnePay's status API and compares the transaction ID, currency and exact amount. Callback metadata and redirect query parameters cannot activate a subscription. Verified success uses the existing transactional ledger, receipt, notification and calendar-period extension logic. Repeated callbacks and return-page checks share the same canonical event, preventing duplicate credit.

The return page calls the authenticated POST `/api/billing/payments/{id}/reconcile` endpoint for pending OnePay payments. It also refreshes status periodically, allowing recovery when a callback is delayed or missed. Payment reads alone have no settlement side effects.

The documentation does not specify idempotent creation, lookup by merchant reference, or a terminal failure state for `status=false`. Creation is therefore claimed once in the database, including across concurrent requests and process restarts. Known sessions reuse their checkout URL; timeouts, malformed responses and unsuccessful/unconfirmed statuses remain pending. An attempt with no recorded session needs operator reconciliation with OnePay before any new checkout is permitted. Never clear its claim simply to retry: the original session may still be chargeable. A callback arriving before the session is saved receives a retryable error; the return page provides a second verification path once the session is recorded.

The payment documentation names `ipg_transaction_id` and `redirect_url` but does not give a complete checkout response example. The adapter accepts those fields directly or within `data`, including `data.gateway.redirect_url`; malformed or incomplete responses are held for reconciliation. Sandbox verification of the merchant's actual response shape is still required. No unlisted authentication headers, callback signatures or idempotency guarantees are assumed.

## Configuration status

Plans and subscription APIs return the same `paymentsEnabled`, `provider`, and safe `configError` fields. Missing credentials, an invalid return URL, or an explicit disabled provider keep checkout disabled with an actionable message. The frontend uses those fields without changing its layout. Billing misconfiguration disables checkout while the backend continues serving trial and existing account operations. A configured status verifies local settings, not merchant credential validity; confirm merchant acceptance in sandbox. Return URLs are used exactly as configured: the server never converts localhost HTTP URLs to HTTPS or invents a return address.

`ONEPAY_API_BASE` is read by the existing adapter for checkout and transaction-status requests; it defaults to `https://api.onepay.lk` and must be an HTTPS origin. `ONEPAY_RETURN_BASE_URL` is an optional frontend origin: when `ONEPAY_RETURN_URL` is empty, the backend appends `/dashboard/billing/success`. An explicit `ONEPAY_RETURN_URL` takes precedence. HTTP and localhost return addresses remain invalid for checkout. The root `.env` and `backend/.env` are loaded independently, preserving already-set process environment values.

### Subscribe dialog

Subscribe validates the organization's saved billing contact and opens OnePay's hosted card payment page directly. If contact validation fails, the existing modal collects the missing details before continuing to OnePay. The application does not collect card numbers or CVV. Unfinished attempts are omitted from payment history and the separate pending-payment banner is removed. Attempts remain stored, and Subscribe reuses an existing checkout for the same plan to prevent duplicate charges. An uncertain attempt without a checkout URL still requires operator reconciliation. Verified payment activates or renews the subscription; the return page refreshes account access and the subscription banner immediately after verification. Billing contact endpoints are GET/PUT `/api/billing/contact`, scoped to the authenticated admin organization. Migration 014 adds a billing contact name without changing the organization owner. Restart the backend after applying migrations.
