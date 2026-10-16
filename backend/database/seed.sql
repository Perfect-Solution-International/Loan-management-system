-- ============================================================================
-- INITIAL SEED DATA FOR LOAN MANAGEMENT SYSTEM
-- ============================================================================

-- Seed Default Settings
INSERT INTO system_settings (id, system_name, currency, default_monthly_rate, default_weekly_rate, default_daily_rate, default_processing_fee, default_admin_fee, late_fee_percentage, grace_period_days)
VALUES (1, 'PSI ONE Microfinance Solutions', 'LKR', 3.0, 1.0, 0.5, 500.0, 250.0, 2.0, 3)
ON CONFLICT (id) DO NOTHING;

-- Seed Users (Passwords hashed for: admin123, officer123, agent123)
-- bcrypt hash for 'admin123' is $2a$10$3m/1h8E6h3oK.vU..e9ePeu88e4WpQ7v92H0qYkO3G92U.zW3K0re (or similar)
-- For demonstration/testing, we insert standard active staff users:
INSERT INTO users (id, name, email, password_hash, role, branch, status, joined_date, permissions)
VALUES
('STF-01', 'Ajith Wickramasinghe', 'admin@psione.lk', '$2a$10$wEeVg7OQ96f.aKkWzX46o.75Pz8187Z7eIuU31c8jXqD9dD05O1Ie', 'Administrator', 'Colombo Central', 'Active', '2025-01-15', '{"approveLoans": true, "recordRepayments": true, "exportReports": true, "manageSettings": true, "manageCustomers": true}'),
('STF-02', 'Chaminda Bandara', 'chaminda.b@psione.lk', '$2a$10$wEeVg7OQ96f.aKkWzX46o.75Pz8187Z7eIuU31c8jXqD9dD05O1Ie', 'Loan Officer', 'Colombo Central', 'Active', '2025-04-10', '{"approveLoans": true, "recordRepayments": true, "exportReports": true, "manageSettings": false, "manageCustomers": true}'),
('STF-03', 'Dinithi Jayawardena', 'dinithi.j@psione.lk', '$2a$10$wEeVg7OQ96f.aKkWzX46o.75Pz8187Z7eIuU31c8jXqD9dD05O1Ie', 'Collection Agent', 'Gampaha Branch', 'Active', '2025-08-01', '{"approveLoans": false, "recordRepayments": true, "exportReports": false, "manageSettings": false, "manageCustomers": true}'),
('USR-001', 'Supun Perera', 'admin@example.com', '$2a$10$wEeVg7OQ96f.aKkWzX46o.75Pz8187Z7eIuU31c8jXqD9dD05O1Ie', 'Administrator', 'Colombo Head Office', 'Active', '2024-01-15', '{"approveLoans": true, "recordRepayments": true, "exportReports": true, "manageSettings": true, "manageCustomers": true}')
ON CONFLICT (id) DO NOTHING;

-- Seed Sample Customers
INSERT INTO customers (id, name, full_name, nic, phone, email, address, village, town, district, occupation, monthly_income, status, registered_at)
VALUES
('CUST-001', 'Kamal Gunaratne', 'Kamal Samantha Gunaratne', '198512345678', '0771234567', 'kamal@example.com', 'No 45, Temple Road', 'Pannipitiya', 'Maharagama', 'Colombo', 'Retail Merchant', 85000.00, 'Active', '2026-01-10'),
('CUST-002', 'Sunil Jayawardena', 'Sunil Rohana Jayawardena', '197823456789', '0712345678', 'sunil@example.com', '12/A Station Road', 'Mirihana', 'Nugegoda', 'Colombo', 'Transport Contractor', 110000.00, 'Active', '2026-02-15'),
('CUST-003', 'Anula Fernando', 'Anula Kumari Fernando', '199034567890', '0753456789', 'anula@example.com', '88 Galle Road', 'Dehiwala South', 'Dehiwala', 'Colombo', 'Dressmaker & Small Business', 65000.00, 'Active', '2026-03-05')
ON CONFLICT (id) DO NOTHING;

-- Seed Sample Active Loans
INSERT INTO loans (id, customer_id, customer_name, loan_no, amount, principal, capital_deduction, interest_deduction, other_fees, interest_rate, rate_period, repayment_frequency, repayment_type, duration, issue_date, first_payment_date, purpose, status, interest, total_repayment, net_disbursement, installment)
VALUES
('LN-001', 'CUST-001', 'Kamal Gunaratne', 'LN-2026-001', 100000.00, 100000.00, 0.00, 0.00, 1000.00, 3.0, 'Monthly', 'Daily', 'Capital + Interest', 30, '2026-09-15', '2026-09-16', 'Working Capital for Grocery Store', 'Active', 10000.00, 110000.00, 99000.00, 3667.00),
('LN-002', 'CUST-002', 'Sunil Jayawardena', 'LN-2026-002', 150000.00, 150000.00, 0.00, 0.00, 1500.00, 3.0, 'Monthly', 'Daily', 'Capital + Interest', 45, '2026-09-20', '2026-09-21', 'Vehicle Spare Parts & Tires', 'Active', 22500.00, 172500.00, 148500.00, 3833.00),
('LN-003', 'CUST-003', 'Anula Fernando', 'LN-2026-003', 80000.00, 80000.00, 0.00, 0.00, 800.00, 3.0, 'Monthly', 'Weekly', 'Capital + Interest', 12, '2026-10-01', '2026-10-08', 'Sewing Machine Purchase', 'Active', 9600.00, 89600.00, 79200.00, 7467.00)
ON CONFLICT (id) DO NOTHING;

-- Seed Initial Payments
INSERT INTO payments (id, loan_id, customer_id, amount, date, type, method, collected_by, receipt_no)
VALUES
('PAY-001', 'LN-001', 'CUST-001', 3667.00, '2026-09-16', 'Capital', 'Cash', 'Nimal Silva', 'REC-2026-0001'),
('PAY-002', 'LN-001', 'CUST-001', 3667.00, '2026-09-17', 'Capital', 'Cash', 'Nimal Silva', 'REC-2026-0002'),
('PAY-003', 'LN-002', 'CUST-002', 3833.00, '2026-09-21', 'Capital', 'Bank Transfer', 'Kasun Bandara', 'REC-2026-0003')
ON CONFLICT (id) DO NOTHING;

-- Seed Audit Trail Log
INSERT INTO audit_logs (id, timestamp, user_name, user_role, action, module, details, severity)
VALUES
('AUD-001', CURRENT_TIMESTAMP, 'Supun Perera', 'Administrator', 'SYSTEM_INITIALIZATION', 'System', 'Initial database schema and seeds created', 'INFO')
ON CONFLICT (id) DO NOTHING;

