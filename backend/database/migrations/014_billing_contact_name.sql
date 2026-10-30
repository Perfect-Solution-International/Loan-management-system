-- Billing contact is supplied by the organization administrator, separately
-- from organization ownership and the lender's display name.
ALTER TABLE organizations ADD COLUMN billing_contact_name TEXT NOT NULL DEFAULT '';
