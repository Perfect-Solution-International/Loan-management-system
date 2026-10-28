-- ============================================================================
-- INITIAL SEED DATA FOR LOAN MANAGEMENT SYSTEM (PRODUCTION / CLEAN SLATE)
-- ============================================================================
-- Default account roles
INSERT INTO
    roles (name)
VALUES
    ('Admin'),
    ('Staff'),
    ('Customer') ON CONFLICT (name) DO NOTHING;

-- 1. Default System Settings
INSERT INTO
    system_settings (
        id,
        system_name,
        currency,
        default_monthly_rate,
        default_weekly_rate,
        default_daily_rate,
        default_processing_fee,
        default_admin_fee,
        late_fee_percentage,
        grace_period_days
    )
VALUES
    (
        1,
        'PSI ONE Microfinance Solutions',
        'LKR',
        3.0,
        1.0,
        0.5,
        500.0,
        250.0,
        2.0,
        3
    ) ON CONFLICT (id) DO NOTHING;

-- 2. One default user for each account role (fresh database seeds).
-- Seeded users use only Admin, Staff, or Customer.
-- Credentials:
--   STF-01  System Admin    admin@psione.lk    admin123
--   STF-02  Staff Officer   staff@psione.lk    Staff@123
--   CUS-01  Demo Customer   customer@psione.lk Customer@123
-- Repair only the original unusable seed hash; preserve changed passwords.
INSERT INTO
    users (
        id,
        name,
        email,
        password_hash,
        role,
        branch,
        status,
        joined_date,
        permissions
    )
VALUES
    (
        'STF-01',
        'System Admin',
        'admin@psione.lk',
        '$2a$10$0HckGxHnKHZqvp7UvMMGZ.kAuHjPYyN4RfpqOjFCEbOxRWSEjGOrG',
        'Admin',
        'Head Office',
        'Active',
        '2025-01-01',
        '{"approveLoans": true, "recordRepayments": true, "exportReports": true, "manageSettings": true, "manageCustomers": true}'
    ),
    (
        'STF-02',
        'Staff Officer',
        'staff@psione.lk',
        '$2a$10$tGdjyWQ8NuG9elcFS4Hauur.KFO3oqqLzC29bcDJ2Bo4UrniWzERe',
        'Staff',
        'Colombo Central',
        'Active',
        '2025-01-15',
        '{"approveLoans": true, "recordRepayments": true, "exportReports": false, "manageSettings": false, "manageCustomers": true}'
    ),
    (
        'CUS-01',
        'Demo Customer',
        'customer@psione.lk',
        '$2a$10$.80U3HP2i0q.lT0apdyHN.A948nTj560yiamBlWMFZP6OpK3gDL9K',
        'Customer',
        'Colombo Central',
        'Active',
        CURRENT_DATE,
        '{"approveLoans": false, "recordRepayments": false, "exportReports": false, "manageSettings": false, "manageCustomers": false}'
    ) ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    role = EXCLUDED.role,
    branch = EXCLUDED.branch,
    password_hash = CASE WHEN users.password_hash = '$2a$10$wEeVg7OQ96f.aKkWzX46o.75Pz8187Z7eIuU31c8jXqD9dD05O1Ie' THEN EXCLUDED.password_hash ELSE users.password_hash END,
    updated_at = CURRENT_TIMESTAMP;

-- Customer portal profile for the default Customer user.
INSERT INTO customers (id, name, email, nic, phone, address, town, district, password_hash)
SELECT id, name, email, 'UNVERIFIED-' || id, '', '', '', '', password_hash
FROM users WHERE id = 'CUS-01' AND role = 'Customer'
ON CONFLICT (id) DO NOTHING;

-- 3. Initial Audit Trail
INSERT INTO
    audit_logs (
        id,
        timestamp,
        user_name,
        user_role,
        action,
        module,
        details,
        severity
    )
VALUES
    (
        'AUD-001',
        CURRENT_TIMESTAMP,
        'System',
        'Admin',
        'SYSTEM_INITIALIZATION',
        'System',
        'Database schema initialized with clean state',
        'INFO'
    ) ON CONFLICT (id) DO NOTHING;