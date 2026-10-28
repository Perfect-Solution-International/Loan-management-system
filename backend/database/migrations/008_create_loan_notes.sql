-- Create loan notes after loans.
CREATE TABLE
    IF NOT EXISTS loan_notes (
        loan_id VARCHAR(50) PRIMARY KEY REFERENCES loans (id) ON DELETE CASCADE,
        promise_date DATE NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW ()
    );