-- Apply once with the migration/maintenance role, in a transaction, after 010.
-- The existing single portfolio is retained intact in an explicitly named legacy tenant.
CREATE TABLE organizations (
 id UUID PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '',
 owner_id VARCHAR(50), status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended')),
 registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), legacy_access_until TIMESTAMPTZ,
 trial_started_at TIMESTAMPTZ, trial_ends_at TIMESTAMPTZ,
 CHECK ((trial_started_at IS NULL AND trial_ends_at IS NULL) OR (trial_started_at IS NOT NULL AND trial_ends_at IS NOT NULL AND trial_ends_at = trial_started_at + INTERVAL '168 hours'))
);
INSERT INTO organizations(id,name,email,legacy_access_until)
 VALUES('00000000-0000-0000-0000-000000000001','Existing PSI One organization','',NOW()+INTERVAL '30 days');

CREATE FUNCTION app_organization_id() RETURNS UUID LANGUAGE SQL STABLE AS
 $$ SELECT NULLIF(current_setting('app.organization_id',true),'')::uuid $$;

DO $$ DECLARE t TEXT; BEGIN
 FOREACH t IN ARRAY ARRAY['users','customers','loans','payments','online_payments','loan_notes','audit_logs','system_settings'] LOOP
  EXECUTE format('ALTER TABLE %I ADD COLUMN organization_id UUID NOT NULL DEFAULT %L REFERENCES organizations(id)',t,'00000000-0000-0000-0000-000000000001');
  EXECUTE format('ALTER TABLE %I ALTER COLUMN organization_id SET DEFAULT app_organization_id()',t);
  EXECUTE format('CREATE INDEX ON %I(organization_id)',t);
 END LOOP;
END $$;
ALTER TABLE users ADD UNIQUE(organization_id,id);
ALTER TABLE organizations ADD CONSTRAINT organizations_owner_fk FOREIGN KEY(id,owner_id) REFERENCES users(organization_id,id);
-- Do not nominate an arbitrary existing user as account owner. A maintenance operator
-- must assign the verified owner of the legacy organization before production rollout.
ALTER TABLE customers DROP CONSTRAINT customers_nic_key;
ALTER TABLE customers ADD UNIQUE(organization_id,nic), ADD UNIQUE(organization_id,id);
DROP INDEX idx_customers_username;
CREATE UNIQUE INDEX idx_customers_username ON customers(organization_id,LOWER(username)) WHERE username IS NOT NULL;
ALTER TABLE loans ADD UNIQUE(organization_id,id), ADD FOREIGN KEY(organization_id,customer_id) REFERENCES customers(organization_id,id);
ALTER TABLE payments ADD FOREIGN KEY(organization_id,loan_id) REFERENCES loans(organization_id,id), ADD FOREIGN KEY(organization_id,customer_id) REFERENCES customers(organization_id,id);
ALTER TABLE online_payments ADD FOREIGN KEY(organization_id,loan_id) REFERENCES loans(organization_id,id), ADD FOREIGN KEY(organization_id,customer_id) REFERENCES customers(organization_id,id);
ALTER TABLE loan_notes ADD FOREIGN KEY(organization_id,loan_id) REFERENCES loans(organization_id,id);
ALTER TABLE system_settings DROP CONSTRAINT system_settings_pkey;
ALTER TABLE system_settings ADD PRIMARY KEY(organization_id,id);
CREATE UNIQUE INDEX users_email_case_insensitive ON users(LOWER(email));

CREATE TABLE platform_administrators (
 id UUID PRIMARY KEY, email TEXT NOT NULL, name TEXT NOT NULL, password_hash TEXT NOT NULL,
 active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX platform_admin_email ON platform_administrators(LOWER(email));
-- Reserve original registration emails even if an account's contact email changes.
CREATE TABLE initial_trial_claims (
 email TEXT PRIMARY KEY, organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE FUNCTION prevent_trial_reset() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME='organizations' THEN
  IF NEW.trial_started_at IS DISTINCT FROM OLD.trial_started_at OR NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at THEN RAISE EXCEPTION 'original trial timestamps are immutable'; END IF;
 ELSE
  IF NEW.trial_start IS DISTINCT FROM OLD.trial_start OR NEW.trial_end IS DISTINCT FROM OLD.trial_end OR (NEW.status='trialing' AND OLD.status<>'trialing') THEN RAISE EXCEPTION 'an initial trial cannot be reset'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER organizations_trial_immutable BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION prevent_trial_reset();
CREATE TABLE subscription_plans (
 id UUID PRIMARY KEY, name TEXT NOT NULL, billing_interval TEXT NOT NULL CHECK(billing_interval IN ('trial','month','year')),
 amount_minor BIGINT CHECK(amount_minor>=0 AND amount_minor<=9000000000000), currency VARCHAR(3), currency_exponent SMALLINT NOT NULL DEFAULT 2 CHECK(currency_exponent BETWEEN 0 AND 3),
 trial_duration INTEGER NOT NULL DEFAULT 0, active BOOLEAN NOT NULL DEFAULT false,
 yearly_discount_percent NUMERIC(5,2) CHECK(yearly_discount_percent>0 AND yearly_discount_percent<100),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CHECK((billing_interval='trial' AND trial_duration=7 AND amount_minor=0) OR (billing_interval IN ('month','year') AND trial_duration=0)),
 CHECK(NOT active OR billing_interval='trial' OR (amount_minor IS NOT NULL AND amount_minor>0 AND currency IS NOT NULL AND currency ~ '^[A-Z]{3}$'))
);
INSERT INTO subscription_plans(id,name,billing_interval,amount_minor,trial_duration,active) VALUES
 ('00000000-0000-0000-0000-000000000007','Free Trial','trial',0,7,true),
 ('00000000-0000-0000-0000-000000000008','Monthly','month',NULL,0,false),
 ('00000000-0000-0000-0000-000000000009','Yearly','year',NULL,0,false);
CREATE TABLE subscriptions (
 id UUID PRIMARY KEY, organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id), plan_id UUID REFERENCES subscription_plans(id),
 status TEXT NOT NULL CHECK(status IN ('trialing','active','past_due','expired','canceled','suspended')),
 trial_start TIMESTAMPTZ, trial_end TIMESTAMPTZ, current_period_start TIMESTAMPTZ, current_period_end TIMESTAMPTZ,
 cancel_at_period_end BOOLEAN NOT NULL DEFAULT false, canceled_at TIMESTAMPTZ, provider_reference TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(organization_id,id), CHECK((trial_start IS NULL AND trial_end IS NULL) OR (trial_start IS NOT NULL AND trial_end IS NOT NULL AND trial_end=trial_start+INTERVAL '168 hours')),
 CHECK((current_period_start IS NULL AND current_period_end IS NULL) OR (current_period_start IS NOT NULL AND current_period_end IS NOT NULL AND current_period_end>current_period_start)),
 CHECK(status<>'trialing' OR (trial_start IS NOT NULL AND trial_end IS NOT NULL)),
 CHECK(status<>'active' OR (current_period_start IS NOT NULL AND current_period_end IS NOT NULL))
);
INSERT INTO subscriptions(id,organization_id,status) VALUES('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','expired');
CREATE INDEX subscriptions_due ON subscriptions(status,trial_end,current_period_end);
CREATE TRIGGER subscriptions_trial_immutable BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION prevent_trial_reset();
CREATE TABLE subscription_payments (
 id UUID PRIMARY KEY, organization_id UUID NOT NULL REFERENCES organizations(id), subscription_id UUID NOT NULL,
 plan_id UUID NOT NULL REFERENCES subscription_plans(id), amount_minor BIGINT NOT NULL CHECK(amount_minor>0), currency VARCHAR(3) NOT NULL,
 currency_exponent SMALLINT NOT NULL CHECK(currency_exponent BETWEEN 0 AND 3), billing_interval TEXT NOT NULL CHECK(billing_interval IN ('month','year')),
 provider TEXT NOT NULL, provider_session_id TEXT, provider_transaction_id TEXT,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','succeeded','failed','canceled')),
 idempotency_key UUID NOT NULL, checkout_url TEXT, payment_date TIMESTAMPTZ, receipt_reference TEXT UNIQUE,
 period_start TIMESTAMPTZ, period_end TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 FOREIGN KEY(organization_id,subscription_id) REFERENCES subscriptions(organization_id,id),
 UNIQUE(organization_id,idempotency_key), UNIQUE(provider,provider_transaction_id), UNIQUE(provider,provider_session_id), UNIQUE(organization_id,id),
 CHECK(status<>'succeeded' OR (provider_transaction_id IS NOT NULL AND payment_date IS NOT NULL AND receipt_reference IS NOT NULL AND period_start IS NOT NULL AND period_end IS NOT NULL AND period_end>period_start))
);
CREATE UNIQUE INDEX subscription_one_pending_checkout ON subscription_payments(organization_id) WHERE status='pending';
CREATE INDEX subscription_payment_history ON subscription_payments(organization_id,created_at DESC);
CREATE TABLE billing_events (
 id UUID PRIMARY KEY, organization_id UUID REFERENCES organizations(id), subscription_id UUID REFERENCES subscriptions(id),
 payment_id UUID REFERENCES subscription_payments(id), event_type TEXT NOT NULL, dedupe_key TEXT NOT NULL UNIQUE,
 details JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX billing_events_organization ON billing_events(organization_id,created_at DESC);
CREATE TABLE billing_notifications (
 id UUID PRIMARY KEY, organization_id UUID NOT NULL REFERENCES organizations(id), event_key TEXT NOT NULL UNIQUE,
 event_type TEXT NOT NULL, message TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), delivered_at TIMESTAMPTZ
);
CREATE TABLE billing_webhook_events (
 provider TEXT NOT NULL, event_id TEXT NOT NULL, payment_id UUID NOT NULL REFERENCES subscription_payments(id),
 payload_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(provider,event_id)
);

-- This role never owns tables and cannot bypass RLS, even if the control-plane
-- connection uses a maintenance role. Every tenant repository switches into it.
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='psi_tenant') THEN CREATE ROLE psi_tenant NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='psi_tenant' AND (rolsuper OR rolbypassrls OR rolcanlogin)) THEN RAISE EXCEPTION 'psi_tenant must be NOLOGIN NOSUPERUSER NOBYPASSRLS'; END IF;
 EXECUTE format('GRANT psi_tenant TO %I',current_user);
 EXECUTE format('GRANT USAGE ON SCHEMA %I TO psi_tenant',current_schema());
END $$;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO psi_tenant;
DO $$ DECLARE t TEXT; BEGIN
 FOREACH t IN ARRAY ARRAY['users','customers','loans','payments','online_payments','loan_notes','audit_logs','system_settings','organizations','subscriptions','subscription_payments','billing_events','billing_notifications'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('CREATE POLICY tenant_isolation ON %I TO psi_tenant USING (%I=app_organization_id()) WITH CHECK (%I=app_organization_id())',t,CASE WHEN t='organizations' THEN 'id' ELSE 'organization_id' END,CASE WHEN t='organizations' THEN 'id' ELSE 'organization_id' END);
  EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON %I TO psi_tenant',t);
 END LOOP;
 EXECUTE format('GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA %I TO psi_tenant',current_schema());
END $$;
GRANT SELECT ON subscription_plans,roles TO psi_tenant;
-- Restrictive insert policies also enforce expiry inside the write transaction,
-- including direct repository use and requests crossing an expiry boundary.
CREATE FUNCTION app_subscription_allows_writes() RETURNS BOOLEAN LANGUAGE SQL VOLATILE AS $$
 SELECT EXISTS(SELECT 1 FROM organizations o JOIN subscriptions s ON s.organization_id=o.id
 WHERE o.id=app_organization_id() AND o.status='active' AND s.status<>'suspended' AND (
 (s.status='trialing' AND s.trial_end>clock_timestamp()) OR (s.status='active' AND s.current_period_end>clock_timestamp()) OR o.legacy_access_until>clock_timestamp()))
$$;
CREATE POLICY subscription_insert ON loans AS RESTRICTIVE FOR INSERT TO psi_tenant WITH CHECK(app_subscription_allows_writes());
CREATE POLICY subscription_insert ON customers AS RESTRICTIVE FOR INSERT TO psi_tenant WITH CHECK(app_subscription_allows_writes());
CREATE POLICY subscription_insert ON users AS RESTRICTIVE FOR INSERT TO psi_tenant WITH CHECK(app_subscription_allows_writes());
CREATE FUNCTION prevent_expired_disbursement() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF current_user='psi_tenant' AND OLD.status='Pending' AND NEW.status IN ('Active','Overdue','Completed') AND NOT app_subscription_allows_writes() THEN
  RAISE EXCEPTION 'subscription renewal required before loan disbursement' USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER loans_subscription_guard BEFORE UPDATE ON loans FOR EACH ROW EXECUTE FUNCTION prevent_expired_disbursement();
CREATE FUNCTION require_paid_activation() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.status='active' AND NOT EXISTS(SELECT 1 FROM subscription_payments p WHERE p.organization_id=NEW.organization_id AND p.subscription_id=NEW.id AND p.status='succeeded') THEN
  RAISE EXCEPTION 'active subscriptions require a verified payment ledger entry' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER subscriptions_verified_activation BEFORE INSERT OR UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION require_paid_activation();
-- Ordinary repositories cannot mutate SaaS state, trial timestamps or organization ownership.
REVOKE INSERT,UPDATE,DELETE ON organizations,subscriptions,subscription_payments,billing_events,billing_notifications FROM psi_tenant;
REVOKE ALL ON platform_administrators,billing_webhook_events FROM psi_tenant;
REVOKE ALL ON initial_trial_claims FROM psi_tenant;
