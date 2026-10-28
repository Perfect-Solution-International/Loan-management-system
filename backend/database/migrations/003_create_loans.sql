-- Create loans and its indexes.
CREATE TABLE
    IF NOT EXISTS loans (
        id VARCHAR(50) PRIMARY KEY,
        customer_id VARCHAR(50) NOT NULL REFERENCES customers (id) ON DELETE RESTRICT,
        customer_name VARCHAR(255),
        loan_no VARCHAR(50) UNIQUE NOT NULL,
        amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
        principal NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
        capital_deduction NUMERIC(15, 2) DEFAULT 0.00,
        interest_deduction NUMERIC(15, 2) DEFAULT 0.00,
        other_fees NUMERIC(15, 2) DEFAULT 0.00,
        interest_rate NUMERIC(8, 4) NOT NULL DEFAULT 0.00,
        rate_period VARCHAR(20) NOT NULL DEFAULT 'Monthly', -- Daily, Weekly, Monthly, Flat
        repayment_frequency VARCHAR(20) NOT NULL DEFAULT 'Daily', -- Daily, Weekly, Monthly
        repayment_type VARCHAR(50) DEFAULT 'Capital + Interest',
        duration INT NOT NULL DEFAULT 30,
        issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
        first_payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
        purpose TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'Pending', -- Pending, Active, Completed, Rejected, Overdue
        interest NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
        total_repayment NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
        net_disbursement NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
        installment NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
        guarantor_name VARCHAR(255),
        guarantor_nic VARCHAR(50),
        guarantor_phone VARCHAR(50),
        guarantor_relationship VARCHAR(50),
        guarantor_address TEXT,
        disbursement_method VARCHAR(50) DEFAULT 'Cash',
        approved_by VARCHAR(100),
        approved_at TIMESTAMP
        WITH
            TIME ZONE,
            notes TEXT,
            created_at TIMESTAMP
        WITH
            TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP
        WITH
            TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

CREATE INDEX IF NOT EXISTS idx_loans_customer_id ON loans (customer_id);

CREATE INDEX IF NOT EXISTS idx_loans_status ON loans (status);

CREATE INDEX IF NOT EXISTS idx_loans_loan_no ON loans (loan_no);

CREATE INDEX IF NOT EXISTS idx_loans_issue_date ON loans (issue_date);

CREATE INDEX IF NOT EXISTS idx_loans_first_payment_date ON loans (first_payment_date);