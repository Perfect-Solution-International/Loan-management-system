-- Create payments and its indexes.
CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(50) PRIMARY KEY,
    loan_id VARCHAR(50) NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    customer_id VARCHAR(50) NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    amount NUMERIC(15, 2) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    type VARCHAR(30) NOT NULL DEFAULT 'Capital', -- Capital, Interest, Other
    notes TEXT,
    method VARCHAR(50) NOT NULL DEFAULT 'Cash', -- Cash, Bank Transfer, Cheque
    collected_by VARCHAR(100) NOT NULL DEFAULT 'Field Officer',
    receipt_no VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_loan_id ON payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date);
CREATE INDEX IF NOT EXISTS idx_payments_receipt_no ON payments(receipt_no);
CREATE INDEX IF NOT EXISTS idx_payments_loan_date ON payments(loan_id, date);

CREATE SEQUENCE IF NOT EXISTS receipt_number_seq;
-- Start above existing sequential receipts without resetting an established sequence.
SELECT setval('receipt_number_seq', GREATEST(
  (SELECT last_value FROM receipt_number_seq),
  COALESCE((SELECT MAX(substring(receipt_no FROM '^REC-[0-9]{4}-([0-9]+)$')::bigint) FROM payments), 0) + 1
), false);
