# Organization subscriptions

PSI One now has organization-owned lending portfolios and a separate SaaS billing ledger. Existing loan/customer/repayment routes and contracts remain in place. `/register` creates lending organizations; the previous borrower registration page is preserved at `/customer-register` with the existing `/api/portal/register` endpoint.

## Architecture and access policy

- `organizations` owns each portfolio. New organization registration creates the owner, organization settings, one subscription, an immutable initial trial claim, and billing events/notifications in one transaction. Database `NOW()` supplies the original timestamps; trial length is exactly seven UTC calendar days.
- Every existing business table has `organization_id`. Documents retain ownership through their customer record. A restricted `psi_tenant` PostgreSQL role, forced row security, and composite foreign keys isolate reads, writes, settings and financial relationships. Inserts get their tenant from the server-scoped connection, never from a request body.
- The control-plane database connection performs identity discovery, authenticated platform operations and verified billing updates. It requires `BYPASSRLS`. **Do not pass this connection to ordinary business repositories.** Each business request pins a connection, switches to `psi_tenant`, sets the verified organization, and resets both settings before returning the connection to the pool. Failed resets discard the connection. Existing repository transactions run on that same physical connection.
- Tenant identity is re-derived from the authenticated user's/customer's live database record, independently of the JWT role, existing permission checks and subscription checks. Organization admins cannot use platform endpoints. Platform accounts live in `platform_administrators`, separately from tenant users; they cannot use tenant business APIs.
- The database also restricts new loan/customer/staff inserts and disbursement transitions, so bypassing the HTTP subscription guard does not bypass expiration.

PostgreSQL superusers and `BYPASSRLS` roles bypass row security; the tenant role must have neither attribute. See the [PostgreSQL row security documentation](https://www.postgresql.org/docs/16/ddl-rowsecurity.html). Startup verifies the role switch and forced row security. Use a dedicated control-plane login with only the required application table/sequence privileges and membership in `psi_tenant`; use a separate migration account for DDL. No database credentials belong in browser environment variables.

### Expiration and essential financial operations

| Operation | Valid trial / active | Expired / past due / canceled / suspended |
| --- | --- | --- |
| Read existing records, reports, permitted exports | Existing role permissions | Existing role permissions |
| Record/correct borrower repayments | Existing role permissions | Existing role permissions |
| Submit, approve, reject borrower bank slips | Existing role permissions | Existing role permissions |
| Collection notes, customer corrections and KYC attachments | Existing role permissions | Existing role permissions |
| Change security settings or deactivate staff | Existing role permissions | Existing role permissions |
| Create customers/staff or originate/disburse loans | Existing role permissions | Blocked, HTTP 402 |
| Reject an existing pending application | Existing role permissions | Existing role permissions |
| Billing, receipts and renewal | Organization admins | Organization admins; a platform suspension requires support |

Essential financial recordkeeping has an **indefinite continuity period**. There is no deadline after which borrower payments silently stop being recorded. Data is never deleted because of a subscription state. The UI redirects an admin to billing after a protected operation returns 402; reading existing records does not force that redirect. Customer portal users never receive organization billing permissions or a subscription purchase requirement.

The server runs a minute-based expiry/reminder worker. Every protected operation and subscription query also checks stored deadlines, so a delayed worker does not extend access. The UI uses the server's current time and days remaining, refreshing on focus and periodically.

### State transitions

| Starting state | Trigger | Result |
| --- | --- | --- |
| No organization | Atomic successful registration | `trialing`, one original seven-day trial |
| `trialing` | Original deadline reached | `expired` |
| `trialing` | Administrator cancellation | `canceled`, lending stops immediately |
| `expired` | Verified failed renewal | `past_due` |
| `trialing`, `expired`, `past_due`, `canceled` | Verified successful payment | `active` |
| `active` | Verified successful renewal | `active`, paid coverage extended |
| `active` | Failed renewal before paid deadline | Existing paid access preserved |
| `active` | Cancellation | Active until paid period ends, then `canceled` |
| `active` | Paid deadline reached | `expired` |
| Any organization | Platform suspension | Effective `suspended`; original trial/paid deadlines keep running |
| Suspended organization | Platform restore | Original subscription state, evaluated against original deadlines |

A subscription-level maintenance hold (`subscriptions.status='suspended'`) is never lifted by a payment. Platform organization suspension is stored independently in `organizations.status`; restoring the organization cannot reset trial or paid timestamps. Public APIs cannot recreate a trial or edit its original dates. Original registration emails stay reserved after contact email changes. Identifying the same legal business across unrelated newly supplied email addresses would require a separately configured business identity verification process.

## Safe database rollout

New migration: `backend/database/migrations/011_saas_subscriptions.sql`. It adds:

- `organizations`, `platform_administrators`, `initial_trial_claims`
- `subscription_plans`, `subscriptions`, `subscription_payments`
- `billing_events`, `billing_webhook_events`, `billing_notifications`
- Organization ownership, indexes, composite foreign keys, forced row policies and database guards on existing tables
- Organization-scoped NIC/username uniqueness, global case-insensitive staff email uniqueness, and an organization-scoped system-settings primary key

Existing IDs, amounts, documents and financial relationships are retained. Existing records stay together in `00000000-0000-0000-0000-000000000001`, named **Existing PSI One organization**. It receives a one-time **30-day migration access window**, not a renewed trial or a fabricated paid subscription. Its subscription starts `expired`, with access separately granted by `legacy_access_until`. Migration does not choose an arbitrary account owner.

1. Back up the existing database and rehearse the migration against a restored copy. Check for staff emails differing only by case before rollout; the migration fails atomically instead of merging conflicting accounts. Schedule a maintenance window: adding ownership, validating constraints and enabling policies can lock populated tables.
2. From `backend`, run `go run ./cmd/migrate` using the migration role's `DB_*` configuration. The runner uses transaction-scoped advisory locking and records each filename and SHA-256 checksum in `schema_migrations`. Existing 001–010 installations are upgraded in place; their idempotent schema migrations are recorded before 011. **Never reset a populated database.** Never edit an already applied migration.
3. Assign the verified owner and actual name/contact details of the legacy organization using the maintenance role. For example, use parameterized SQL equivalent to `UPDATE organizations SET owner_id = :verified_owner_id, name = :actual_name, email = :contact_email, phone = :phone WHERE id = '00000000-0000-0000-0000-000000000001'`. The owner must already belong to this organization; a composite foreign key enforces that relationship.
4. Configure the runtime control-plane login with `BYPASSRLS`, membership in `psi_tenant`, schema usage, and the required application table/sequence DML privileges. It does not need migration/DDL permissions. The migration grants `psi_tenant` membership to its own executing role; a different runtime role must be granted that membership separately. `psi_tenant` must remain `NOLOGIN NOSUPERUSER NOBYPASSRLS` and must not own the tables.
5. Provision a separate platform account, publish actual prices, select a real gateway implementation before accepting live payments, and migrate the existing organization to a verified paid plan before its migration window ends.
6. Start the updated backend and frontend together. Existing JWTs still work when their live account/role remains valid; their organization is looked up on the server.

Fresh local/Docker installs can still use the existing development seed. Docker's `bootstrap.sh` applies and records migration checksums transactionally, then seeds. Existing Docker volumes are not auto-migrated; run the migration command. Do not use seeded development passwords in production. On a fresh non-Docker development database, run migrations first and seed explicitly if needed.

The existing administrator recovery command now requires `ADMIN_ORGANIZATION_ID` so it cannot create a tenant-less administrator. It only affects an explicitly selected organization. `go run ./cmd/platform-admin` provisions platform identities independently.

## Payment configuration and invariants

**OnePay hosted checkout is implemented; merchant configuration is required.** See [OnePay setup and verification](onepay-billing.md). Paid plan prices and currencies start unset/inactive. The platform UI at `/platform` sets price, currency, currency exponent and publication state. A yearly discount is displayed only if explicitly entered. Changing plan pricing affects future checkout snapshots; saved attempts retain their original amount, currency, interval and exponent. All amounts use integer minor units.

Default `BILLING_PROVIDER=` leaves checkout disabled (503). The development adapter requires all of:

```env
ENV=development
BILLING_PROVIDER=test
BILLING_TEST_WEBHOOK_SECRET=<generate a separate random value of at least 32 characters>
```

For OnePay, configure `BILLING_PROVIDER=onepay` and the backend credentials and HTTPS return URL described in the OnePay guide. Leave the provider blank to disable checkout. The server rejects test mode in production; test webhook/completion endpoints return 404 and cannot grant live access. Production also requires a unique `JWT_SECRET` of at least 32 characters.

`billing.Provider` defines hosted checkout creation, verified event handling and recurring capability. The OnePay adapter uses the documented hosted checkout and status APIs. For additional providers, implement their approved contract in this layer. Provider requirements:

- Configure its actual sandbox/live credentials, supported currencies, signature verification and merchant account settings on the backend.
- Use `Payment.ID` as the provider's idempotency key. Persist attempts before contacting the gateway. Retrying an uncertain timeout must retrieve/recreate the same provider session, never charge a fresh attempt. Pending attempts are not aged into failure without provider evidence.
- Use HTTPS hosted checkout and server-originated return/cancel URLs containing the payment reference. Return pages only fetch status; they do not settle payments.
- Verify signatures against the exact raw body and reject stale/replayed messages. Retrieve canonical transaction state directly from the provider where required; never trust arbitrary signed event ordering alone. Map verified provider fields into `VerifiedEvent`.
- Validate organization, subscription, payment/session reference, transaction, amount and currency against the saved checkout. Confirm server receipt/invoice fields before displaying success.
- Reconcile payment callbacks that arrive before session creation has been persisted by retrying/retrieving provider state. Reconciliation must retain uncertain saved attempts. Configure provider webhook retries and operational alerting.
- Keep recurring capability false unless the approved provider supports it and its mandate creation, renewals, cancellation and revocation handling have been implemented and tested. The shipped workflow is manual renewal; cancellation never claims a refund.

The current test signature is HMAC-SHA256 of `timestamp + '.' + raw_body` in `X-Billing-Signature`, with Unix seconds in `X-Billing-Timestamp` and a five-minute skew window. Its completion endpoint creates and verifies this event on the backend; no shared secret is sent to the browser. Both direct Go webhooks and the Next.js proxy preserve the relevant headers.

Subscription row locks serialize checkout/activation/renewal/cancellation. One pending checkout is allowed per organization. Webhook event IDs/payload hashes, unique provider transaction/session references and terminal successful payments prevent duplicate credit. Late failure cannot revoke verified payment, and delayed verified success can supersede an earlier failure exactly once. A different transaction against an already paid checkout requires reconciliation. Concurrent distinct paid checkouts extend coverage rather than overwrite paid time. Cancellation after checkout creation is respected even if payment confirmation arrives later.

Manual renewal adds one or twelve UTC calendar months, clamping dates such as January 31 to the last day of February. Renewal starts at the later of the current paid end or confirmation time. A trial conversion starts its paid period at verified confirmation. No raw card numbers or CVV are stored. Borrower collections remain in the original `payments`/`online_payments` tables.

## Notifications and receipts

Billing events and a deduplicated notification outbox commit in the same transaction. The dashboard shows billing updates. Trial-start, trial-ending, trial-expired, payment success/failure, activation, renewal, cancellation and approaching paid expiry notifications are supported. The worker creates expiry/reminder records without needing a frontend visit.

No email service is configured or contacted. `billing.NotificationSender` and `BillingRepository.DispatchNotification` are the extension points for an explicitly configured transport. Dispatch uses `FOR UPDATE SKIP LOCKED`; failed sends remain pending. A transport must use `EventKey` for idempotent delivery to handle a crash between delivery and database commit. Without a transport, notifications stay available in the app/outbox; external email delivery is not claimed.

Receipts are downloaded as authenticated plain-text documents from backend-verified receipt data. Pending/failed payments have no receipt. Test receipts are visibly labeled as development transactions. This is a payment receipt, not a configured tax invoice.

## REST API

All paths below are relative to `/api`. Existing business endpoints remain unchanged. Billing responses are `Cache-Control: no-store`.

| Method | Path | Access / purpose |
| --- | --- | --- |
| GET | `/billing/plans` | Public published plans and payment availability |
| POST | `/organizations/register` | Public organization/owner/trial registration |
| GET | `/billing/subscription` | Organization admin; effective state and server time |
| POST | `/billing/checkout` | Organization admin; `{planId, idempotencyKey}` |
| POST | `/billing/renew` | Organization admin; same secure checkout workflow |
| POST | `/billing/cancel` | Organization admin; schedule cancellation / end trial |
| GET | `/billing/payments?offset=0` | Organization admin; 100 records per page |
| GET | `/billing/payments/{id}` | Organization admin; verified saved payment state |
| GET | `/billing/payments/{id}/receipt` | Organization admin; successful payment receipt data |
| GET | `/billing/notifications` | Organization admin; latest 50 billing updates |
| POST | `/billing/webhooks/{provider}` | Provider authentication, no user JWT |
| POST | `/billing/payments/{id}/test-complete` | Development test adapter + organization admin only |
| POST | `/platform/login` | Separate platform credentials |
| GET / POST | `/platform/plans` | Live platform identity; list/create plans |
| PUT | `/platform/plans/{id}` | Live platform identity; update paid plans |
| GET | `/platform/organizations?offset=0` | Platform admin; 100 organizations per page |
| GET | `/platform/subscriptions?offset=0` | Platform admin; 100 subscriptions per page |
| PATCH | `/platform/organizations/{id}/status` | Platform admin; `{status: "active" | "suspended"}` |

Organization registration accepts `organizationName`, `adminName`, `email`, `phone`, `password`, `confirmPassword`; password length is 12–72 characters. It returns a normal staff JWT and server-assigned organization/user IDs. Trial timestamps are not accepted in the payload. Public registration/login has a bounded in-memory per-socket-IP limiter (40 requests per 10 minutes); configure a shared perimeter limiter and trusted proxy policy for a multi-instance deployment.

Borrower login accepts optional `organizationId`. A globally unambiguous existing login still works unchanged; identifiers shared across lenders require the supplied lender ID. Public borrower registration uses a supplied organization ID, with the legacy organization as the compatibility default. This selection only chooses the lender; existing password/ownership checks still control access.

## Frontend routes

| Route | Purpose |
| --- | --- |
| `/pricing` | Public trial/monthly/yearly pricing and comparison |
| `/register` | Lending organization signup with automatic trial/login |
| `/customer-register` | Preserved borrower signup, optional lender organization ID |
| `/dashboard/billing` | Admin subscription, trial/paid dates, checkout, renewal, cancellation and updates |
| `/dashboard/billing/history` | Paginated billing history and receipt downloads |
| `/dashboard/billing/success?payment=...` | Fetches backend payment status; URL alone never proves payment |
| `/dashboard/billing/failed?payment=...` | Same authoritative status display |
| `/dashboard/billing/canceled?payment=...` | Same authoritative status display |
| `/dashboard/billing/test-checkout?payment=...` | Explicitly configured development simulation |
| `/platform/login` | Separate platform sign-in |
| `/platform` | Plan publication, organization subscriptions, suspension/restore |

The original theme, dashboard shell, brand, modal/loading components, authentication and data provider are retained. The billing navigation/trial banner is admin-only. Platform sessions use a separate browser token and cannot become tenant sessions.

## Environment and provisioning

| Variable | Use |
| --- | --- |
| Existing `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSLMODE` | Backend/migration database connection; use separate runtime and migration role credentials |
| Existing `JWT_SECRET`, `ENV`, `PORT`, `ALLOWED_ORIGINS` | Existing auth/server configuration; unique production signing secret required |
| Existing `BACKEND_API_URL` | Next.js server proxy target, e.g. `http://127.0.0.1:8080/api` |
| `BILLING_PROVIDER` | Blank disables payments; `test` is development-only |
| `BILLING_TEST_WEBHOOK_SECRET` | Separate development HMAC secret, at least 32 characters |
| `PLATFORM_ADMIN_EMAIL`, `PLATFORM_ADMIN_PASSWORD` | Read only by `go run ./cmd/platform-admin`; password 12–72 characters |
| `ADMIN_ORGANIZATION_ID` | Required explicit tenant for the existing `go run ./cmd/admin` recovery command |
| `TEST_DATABASE_DSN` | Disposable PostgreSQL instance for integration tests; never sourced from `.env` |

No new frontend public secrets or hardcoded subscription prices are required. No live gateway credentials are invented. Provision the platform account from `backend` after migration, then remove its plaintext password from the shell environment. Ordinary administrator credentials do not grant platform access.

## Verification

Run Go tests from `backend`:

```powershell
$env:TEST_DATABASE_DSN = 'host=127.0.0.1 port=<disposable-port> user=<test-owner> dbname=<test-database> sslmode=disable'
go test ./... -count=1
go vet ./...
```

The integration suites create/drop unique test schemas. The test login must be able to create schemas/roles and exercise RLS; do not point this at a production database. Without `TEST_DATABASE_DSN`, integration tests skip explicitly.

Frontend checks from the repository root:

```powershell
npm.cmd run typecheck
$env:NODE_ENV = 'production'
npm.cmd run build
```

`scripts/test-saas-browser.mjs` exercises a disposable development instance with an explicitly provisioned platform test account. It requires Playwright and installed Chrome; set `PLAYWRIGHT_MODULE` if it is installed outside `.tmp/node_modules/playwright`. Supply `SAAS_TEST_BASE_URL`, `SAAS_TEST_PLATFORM_EMAIL`, `SAAS_TEST_PLATFORM_PASSWORD`. The script publishes fixture prices and registers a new test organization, then verifies pricing, registration, trial notices, verified test payments, history, cancellation, failed/canceled outcomes, receipt download and 390px layouts. It saves screenshots in `artifacts/saas` and must not target production.

Validation recorded on 2026-10-29:

- `go test ./... -count=1` and `go vet ./...` passed, including the existing loan/repayment integration suite and SaaS registration, trial boundaries, database guards, tenant/portal isolation, verified payment/renewal/cancellation, concurrent checkout/webhooks, uncertain provider response recovery, platform holds, immutable trial claims and unattended expiry/reminder tests.
- Fresh versioned migration, a repeated no-op migration run, platform-account provisioning and preservation of existing financial/document records passed on disposable databases.
- Frontend typecheck, production build and targeted ESLint checks passed. Full repository lint still reports 31 existing errors and 168 warnings; the existing data-provider effect error is unchanged, and no new files have lint errors.
- Nine Chrome browser workflow groups passed against the production frontend build and explicitly configured development backend. They cover platform pricing/suspension, organization registration/login, trial notices, hosted test checkout, verified receipt download, history, subscription cancellation, failed/canceled payment results and 390px layouts. No browser runtime errors were observed. Screenshots and a clearly marked test receipt are in `artifacts/saas`.

Local integration/browser runs use an isolated PostgreSQL 18 instance because that is the locally installed server. PostgreSQL 16/Docker deployment must still be rehearsed; the Docker daemon was unavailable here. Live gateway settlement and external notification delivery cannot be verified until those providers are selected/configured. The application's configured working database was not migrated or reset during implementation.

## File inventory

Created backend files:

- `backend/database/migrations/011_saas_subscriptions.sql`, `backend/database/tenant.go`, `backend/database/bootstrap.sh`
- `backend/billing/models.go`, `provider.go`, `notifications.go`, `billing_test.go`
- `backend/repository/billing_repo.go`, `billing_payments.go`, `billing_notifications.go`, `billing_organizations.go`
- `backend/handlers/billing_handler.go`, `tenant_handler.go`
- `backend/cmd/server/saas.go`, `saas_integration_test.go`
- `backend/cmd/migrate/main.go`, `backend/cmd/platform-admin/main.go`

Created frontend/testing/documentation files:

- `src/lib/billing-api.ts`
- `src/components/billing/plan-cards.tsx`, `subscription-banner.tsx`, `payment-history.tsx`, `payment-result.tsx`
- `src/app/pricing/page.tsx`
- `src/app/(auth)/customer-register/page.tsx` (preserved previous registration page)
- `src/app/(dashboard)/dashboard/billing/page.tsx`, `history/page.tsx`, `[result]/page.tsx`, `test-checkout/page.tsx`
- `src/app/platform/page.tsx`, `login/page.tsx`
- `scripts/test-saas-browser.mjs`, `docs/saas-subscriptions.md`

Modified existing files:

- `backend/config/config.go`, `backend/database/database.go`, `backend/database/seed.sql`, `backend/docker-compose.yml`, `backend/.env.example`
- `backend/middleware/auth.go`, `backend/cmd/server/main.go`, `backend/cmd/admin/main.go`
- `src/lib/api-client.ts`, `src/providers/data-provider.tsx`
- `src/app/(auth)/register/page.tsx`, `src/app/(auth)/login/page.tsx`
- `src/app/(dashboard)/layout.tsx`, `src/components/layout/Sidebar.tsx`, `src/app/api/backend/[...path]/route.ts`
- `README.md`, `backend/README.md`
