-- Existing customer records remain intact. Portal access requires a password set by staff.
ALTER TABLE customers ADD COLUMN IF NOT EXISTS password_hash TEXT NOT NULL DEFAULT '';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS username VARCHAR(100);
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_username ON customers (LOWER(username)) WHERE username IS NOT NULL;
CREATE SEQUENCE IF NOT EXISTS receipt_number_seq;
-- Start above existing sequential receipts without resetting an established sequence.
SELECT setval('receipt_number_seq', GREATEST(
  (SELECT last_value FROM receipt_number_seq),
  COALESCE((SELECT MAX(substring(receipt_no FROM '^REC-[0-9]{4}-([0-9]+)$')::bigint) FROM payments), 0) + 1
), false);

CREATE TABLE IF NOT EXISTS loan_notes (
 loan_id VARCHAR(50) PRIMARY KEY REFERENCES loans(id) ON DELETE CASCADE,
 promise_date DATE NOT NULL, note TEXT NOT NULL DEFAULT '', updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
