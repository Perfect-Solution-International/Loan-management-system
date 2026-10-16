-- ============================================================================
-- PSI ONE LOAN MANAGEMENT SYSTEM - POSTGRESQL INITIAL DATABASE SCHEMA
-- Migration: 001_init.sql
-- ============================================================================

-- Enable UUID extension if available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS & STAFF TABLE
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'Loan Officer', -- Administrator, Loan Officer, Collection Agent, Auditor
    branch VARCHAR(100) NOT NULL DEFAULT 'Colombo Central',
    status VARCHAR(20) NOT NULL DEFAULT 'Active', -- Active, Inactive
    joined_date DATE NOT NULL DEFAULT CURRENT_DATE,
    permissions JSONB NOT NULL DEFAULT '{"approveLoans": false, "recordRepayments": true, "exportReports": false, "manageSettings": false, "manageCustomers": true}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. CUSTOMERS / BORROWERS TABLE
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

-- 3. LOANS TABLE
CREATE TABLE IF NOT EXISTS loans (
    id VARCHAR(50) PRIMARY KEY,
    customer_id VARCHAR(50) NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
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
    approved_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_loans_customer_id ON loans(customer_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_loan_no ON loans(loan_no);

-- 4. REPAYMENTS / PAYMENTS TABLE
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

-- 5. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_name VARCHAR(100) NOT NULL,
    user_role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    module VARCHAR(50) NOT NULL,
    details TEXT,
    ip_address VARCHAR(50),
    severity VARCHAR(20) NOT NULL DEFAULT 'INFO', -- INFO, WARNING, CRITICAL
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_module ON audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);

-- 6. SYSTEM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS system_settings (
    id INT PRIMARY KEY DEFAULT 1,
    system_name VARCHAR(100) NOT NULL DEFAULT 'PSI ONE Microfinance Solutions',
    currency VARCHAR(10) NOT NULL DEFAULT 'LKR',
    default_monthly_rate NUMERIC(8, 4) DEFAULT 3.0,
    default_weekly_rate NUMERIC(8, 4) DEFAULT 1.0,
    default_daily_rate NUMERIC(8, 4) DEFAULT 0.5,
    default_capital_deduction_rate NUMERIC(8, 4) DEFAULT 0.0,
    default_interest_deduction_method VARCHAR(50) DEFAULT 'COLLECTED_VIA_INSTALLMENTS',
    default_processing_fee NUMERIC(15, 2) DEFAULT 500.0,
    default_admin_fee NUMERIC(15, 2) DEFAULT 250.0,
    late_fee_percentage NUMERIC(8, 4) DEFAULT 2.0,
    grace_period_days INT DEFAULT 3,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

