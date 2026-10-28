-- Create online_payments and its indexes.
CREATE TABLE
    IF NOT EXISTS online_payments (
        id VARCHAR(50) PRIMARY KEY,
        loan_id VARCHAR(50) NOT NULL REFERENCES loans (id) ON DELETE CASCADE,
        loan_no VARCHAR(50),
        customer_id VARCHAR(50) NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
        customer_name VARCHAR(150) NOT NULL,
        customer_phone VARCHAR(50),
        customer_nic VARCHAR(50),
        amount NUMERIC(15, 2) NOT NULL,
        payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
        submitted_at TIMESTAMP
        WITH
            TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            bank_name VARCHAR(100) NOT NULL,
            reference_number VARCHAR(100),
            slip_url TEXT NOT NULL,
            slip_file_name VARCHAR(255),
            slip_file_type VARCHAR(50),
            status VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- PENDING, COMPLETED, REJECTED
            reviewed_by VARCHAR(100),
            reviewed_at VARCHAR(50),
            review_notes TEXT,
            receipt_no VARCHAR(50),
            notes TEXT,
            payment_method VARCHAR(50) DEFAULT 'BANK_SLIP',
            created_at TIMESTAMP
        WITH
            TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP
        WITH
            TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

CREATE INDEX IF NOT EXISTS idx_online_payments_loan_id ON online_payments (loan_id);

CREATE INDEX IF NOT EXISTS idx_online_payments_customer_id ON online_payments (customer_id);

CREATE INDEX IF NOT EXISTS idx_online_payments_status ON online_payments (status);

CREATE INDEX IF NOT EXISTS idx_online_payments_date ON online_payments (payment_date);