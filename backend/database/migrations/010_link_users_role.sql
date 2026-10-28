-- Retain the role names supported by existing staff screens and authorization.
INSERT INTO roles (name)
VALUES ('Admin'), ('Staff'), ('Customer'),
       ('Administrator'), ('Loan Officer'), ('Collection Agent'), ('Auditor')
ON CONFLICT (name) DO NOTHING;

-- Preserve any other roles already assigned before enforcing the relationship.
INSERT INTO roles (name)
SELECT DISTINCT role FROM users
ON CONFLICT (name) DO NOTHING;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'users'::regclass AND conname = 'fk_users_role'
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT fk_users_role FOREIGN KEY (role) REFERENCES roles (name)
            ON UPDATE RESTRICT ON DELETE RESTRICT;
    END IF;
END
$$;
