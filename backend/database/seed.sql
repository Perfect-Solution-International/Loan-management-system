-- ============================================================================
-- INITIAL SEED DATA FOR LOAN MANAGEMENT SYSTEM (PRODUCTION / CLEAN SLATE)
-- ============================================================================
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

-- 2. Authorized Staff Users & Administrators
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
        'Administrator',
        'Colombo Central',
        'Active',
        '2025-01-15',
        '{"approveLoans": true, "recordRepayments": true, "exportReports": true, "manageSettings": true, "manageCustomers": true}'
    ),
    (
        'STF-02',
        'Chaminda Bandara',
        'chaminda.b@psione.lk',
        '$2a$10$wEeVg7OQ96f.aKkWzX46o.75Pz8187Z7eIuU31c8jXqD9dD05O1Ie',
        'Loan Officer',
        'Colombo Central',
        'Active',
        '2025-04-10',
        '{"approveLoans": true, "recordRepayments": true, "exportReports": true, "manageSettings": false, "manageCustomers": true}'
    ),
    (
        'STF-03',
        'Dinithi Jayawardena',
        'dinithi.j@psione.lk',
        '$2a$10$wEeVg7OQ96f.aKkWzX46o.75Pz8187Z7eIuU31c8jXqD9dD05O1Ie',
        'Collection Agent',
        'Gampaha Branch',
        'Active',
        '2025-08-01',
        '{"approveLoans": false, "recordRepayments": true, "exportReports": false, "manageSettings": false, "manageCustomers": true}'
    ),
    (
        'USR-001',
        'Supun Perera',
        'admin@example.com',
        '$2a$10$wEeVg7OQ96f.aKkWzX46o.75Pz8187Z7eIuU31c8jXqD9dD05O1Ie',
        'Administrator',
        'Colombo Head Office',
        'Active',
        '2024-01-15',
        '{"approveLoans": true, "recordRepayments": true, "exportReports": true, "manageSettings": true, "manageCustomers": true}'
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