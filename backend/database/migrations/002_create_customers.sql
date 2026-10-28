-- Create customers and its indexes.
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    nic VARCHAR(50) UNIQUE NOT NULL,
    phone VARCHAR(50) NOT NULL,
    alternate_phone VARCHAR(50),
    email VARCHAR(255),
    dob DATE,
    gender VARCHAR(20),
    primary_contact VARCHAR(100),
    address TEXT NOT NULL,
    village VARCHAR(100),
    town VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    occupation VARCHAR(100),
    monthly_income NUMERIC(15, 2) DEFAULT 0.00,
    emergency_contact VARCHAR(100),
    guarantor_name VARCHAR(255),
    guarantor_nic VARCHAR(50),
    guarantor_phone VARCHAR(50),
    guarantor_relationship VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'Active', -- Active, Inactive, Suspended
    registered_at DATE NOT NULL DEFAULT CURRENT_DATE,
    photo_url TEXT,
    nic_front_url TEXT,
    nic_back_url TEXT,
    documents JSONB DEFAULT '[]'::jsonb,
    has_existing_loan BOOLEAN DEFAULT false,
    existing_loan_notes TEXT,
    prior_repayment_history TEXT,
    initial_outstanding_balance NUMERIC(15, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_nic ON customers(nic);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);

-- Existing customer records remain intact. Portal access requires a password set by staff.
ALTER TABLE customers ADD COLUMN IF NOT EXISTS password_hash TEXT NOT NULL DEFAULT '';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS username VARCHAR(100);
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_username ON customers (LOWER(username)) WHERE username IS NOT NULL;
