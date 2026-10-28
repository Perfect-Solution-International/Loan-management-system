-- Create users and its indexes.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE
    IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'Loan Officer', -- Administrator, Loan Officer, Collection Agent, Auditor
        branch VARCHAR(100) NOT NULL DEFAULT 'Colombo Central',
        status VARCHAR(20) NOT NULL DEFAULT 'Active', -- Active, Inactive
        joined_date DATE NOT NULL DEFAULT CURRENT_DATE,
        permissions JSONB NOT NULL DEFAULT '{"approveLoans": false, "recordRepayments": true, "exportReports": false, "manageSettings": false, "manageCustomers": true}',
        created_at TIMESTAMP
        WITH
            TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP
        WITH
            TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);