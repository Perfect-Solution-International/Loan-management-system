-- A durable claim prevents another checkout request after a timeout or crash.
-- OnePay does not document idempotent checkout creation.
ALTER TABLE subscription_payments
ADD COLUMN checkout_started_at TIMESTAMPTZ;