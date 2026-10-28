-- Create audit_logs and its indexes.
CREATE TABLE
    IF NOT EXISTS audit_logs (
        id VARCHAR(50) PRIMARY KEY,
        timestamp TIMESTAMP
        WITH
            TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            user_name VARCHAR(100) NOT NULL,
            user_role VARCHAR(50) NOT NULL,
            action VARCHAR(100) NOT NULL,
            module VARCHAR(50) NOT NULL,
            details TEXT,
            ip_address VARCHAR(50),
            severity VARCHAR(20) NOT NULL DEFAULT 'INFO', -- INFO, WARNING, CRITICAL
            created_at TIMESTAMP
        WITH
            TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

CREATE INDEX IF NOT EXISTS idx_audit_module ON audit_logs (module);

CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs (timestamp);