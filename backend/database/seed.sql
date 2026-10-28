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
-- Preserve existing accounts and password hashes when seeds are rerun.
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
        'Ajith Wickramasinghe',
        'admin@psione.lk',
        '$2a$10$wEeVg7OQ96f.aKkWzX46o.75Pz8187Z7eIuU31c8jXqD9dD05O1Ie',
        'Admin',
        'Colombo Central',
        'Active',
        '2025-01-15',
        '{"approveLoans": true, "recordRepayments": true, "exportReports": true, "manageSettings": true, "manageCustomers": true}'
    ),
    (
        'STF-02',
        'Chaminda Bandara',
        'staff@psione.lk',
        '$2a$10$wEeVg7OQ96f.aKkWzX46o.75Pz8187Z7eIuU31c8jXqD9dD05O1Ie',
        'Staff',
        'Colombo Central',
        'Active',
        '2025-04-10',
        '{"approveLoans": false, "recordRepayments": true, "exportReports": false, "manageSettings": false, "manageCustomers": true}'
    ),
    (
        'CUS-01',
        'Customer Account',
        'customer@psione.lk',
        '$2a$10$wEeVg7OQ96f.aKkWzX46o.75Pz8187Z7eIuU31c8jXqD9dD05O1Ie',
        'Customer',
        'Colombo Central',
        'Active',
        CURRENT_DATE,
        '{"approveLoans": false, "recordRepayments": false, "exportReports": false, "manageSettings": false, "manageCustomers": false}'
    ) ON CONFLICT (id) DO NOTHING;

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
        'Administrator',
        'SYSTEM_INITIALIZATION',
        'System',
        'Database schema initialized with clean state',
        'INFO'
    ) ON CONFLICT (id) DO NOTHING;