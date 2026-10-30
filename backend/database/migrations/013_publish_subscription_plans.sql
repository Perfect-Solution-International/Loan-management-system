-- Publish active monthly and yearly subscription plans with standard pricing
UPDATE subscription_plans
SET amount_minor = 500000,
    currency = 'LKR',
    currency_exponent = 2,
    active = true,
    updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000008' AND (amount_minor IS NULL OR amount_minor = 0);

UPDATE subscription_plans
SET amount_minor = 5000000,
    currency = 'LKR',
    currency_exponent = 2,
    yearly_discount_percent = 15.00,
    active = true,
    updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000009' AND (amount_minor IS NULL OR amount_minor = 0);

-- Ensure existing legacy organization has owner and contact info configured
UPDATE organizations
SET owner_id = COALESCE(owner_id, (SELECT id FROM users WHERE organization_id = '00000000-0000-0000-0000-000000000001' AND role = 'Admin' ORDER BY created_at LIMIT 1)),
    email = CASE WHEN email = '' OR email IS NULL THEN 'admin@psione.lk' ELSE email END,
    phone = CASE WHEN phone = '' OR phone IS NULL THEN '+94771234567' ELSE phone END
WHERE id = '00000000-0000-0000-0000-000000000001';
