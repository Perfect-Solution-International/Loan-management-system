-- Create system_settings and its indexes.
CREATE TABLE
    IF NOT EXISTS system_settings (
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
        updated_at TIMESTAMP
        WITH
            TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );