-- Upgrade legacy roles in place; permission grants are preserved.
INSERT INTO roles (name) VALUES ('Admin'), ('Staff'), ('Customer') ON CONFLICT (name) DO NOTHING;
UPDATE users SET role = CASE
 WHEN role = 'Administrator' THEN 'Admin'
 WHEN role IN ('Loan Officer', 'Collection Agent', 'Auditor') THEN 'Staff'
 ELSE role END WHERE role IN ('Administrator', 'Loan Officer', 'Collection Agent', 'Auditor');
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'Staff';
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='users'::regclass AND conname='chk_users_role') THEN
  ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (role IN ('Admin','Staff','Customer'));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='users'::regclass AND conname='fk_users_role') THEN
  ALTER TABLE users ADD CONSTRAINT fk_users_role FOREIGN KEY(role) REFERENCES roles(name) ON UPDATE RESTRICT ON DELETE RESTRICT;
 END IF;
END $$;
DELETE FROM roles WHERE name NOT IN ('Admin','Staff','Customer');
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='roles'::regclass AND conname='chk_roles_name') THEN
  ALTER TABLE roles ADD CONSTRAINT chk_roles_name CHECK (name IN ('Admin','Staff','Customer'));
 END IF;
END $$;

-- Normalize historical audit role labels to the same role vocabulary.
UPDATE audit_logs SET user_role = CASE
 WHEN user_role = 'Administrator' THEN 'Admin'
 WHEN user_role IN ('Loan Officer','Collection Agent','Auditor') THEN 'Staff'
 ELSE user_role END WHERE user_role IN ('Administrator','Loan Officer','Collection Agent','Auditor');
