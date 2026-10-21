package repository

import (
	"database/sql"
	"fmt"
	"time"

	"loan-management-backend/database"
	"loan-management-backend/models"
)

type PaymentRepository struct {
	db *database.DB
}

func NewPaymentRepository(db *database.DB) *PaymentRepository {
	return &PaymentRepository{db: db}
}

func (r *PaymentRepository) GetAll() ([]models.Payment, error) {
	query := `
		SELECT id, loan_id, customer_id, amount, date, type, notes, method, collected_by, receipt_no, created_at
		FROM payments
		ORDER BY date DESC, created_at DESC
	`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query payments: %w", err)
	}
	defer rows.Close()

	var payments []models.Payment
	for rows.Next() {
		p, err := scanPayment(rows)
		if err != nil {
			return nil, err
		}
		payments = append(payments, *p)
	}

	return payments, nil
}

func (r *PaymentRepository) GetByLoanID(loanID string) ([]models.Payment, error) {
	query := `
		SELECT id, loan_id, customer_id, amount, date, type, notes, method, collected_by, receipt_no, created_at
		FROM payments
		WHERE loan_id = $1
		ORDER BY date DESC, created_at DESC
	`
	rows, err := r.db.Query(query, loanID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var payments []models.Payment
	for rows.Next() {
		p, err := scanPayment(rows)
		if err != nil {
			return nil, err
		}
		payments = append(payments, *p)
	}
	return payments, nil
}

func (r *PaymentRepository) GetByCustomerID(customerID string) ([]models.Payment, error) {
	query := `
		SELECT id, loan_id, customer_id, amount, date, type, notes, method, collected_by, receipt_no, created_at
		FROM payments
		WHERE customer_id = $1
		ORDER BY date DESC, created_at DESC
	`
	rows, err := r.db.Query(query, customerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var payments []models.Payment
	for rows.Next() {
		p, err := scanPayment(rows)
		if err != nil {
			return nil, err
		}
		payments = append(payments, *p)
	}
	return payments, nil
}

func (r *PaymentRepository) GetCount() (int, error) {
	var count int
	err := r.db.QueryRow("SELECT COUNT(*) FROM payments").Scan(&count)
	return count, err
}

func (r *PaymentRepository) Create(p *models.Payment) error {
	query := `
		INSERT INTO payments (
			id, loan_id, customer_id, amount, date, type, notes, method, collected_by, receipt_no, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()
		)
	`
	_, err := r.db.Exec(query,
		p.ID, p.LoanID, p.CustomerID, p.Amount, p.Date, p.Type, p.Notes, p.Method, p.CollectedBy, p.ReceiptNo,
	)
	return err
}

func scanPayment(rows *sql.Rows) (*models.Payment, error) {
	var p models.Payment
	var notes, receiptNo *string
	var dt time.Time

	err := rows.Scan(
		&p.ID, &p.LoanID, &p.CustomerID, &p.Amount, &dt, &p.Type, &notes, &p.Method, &p.CollectedBy, &receiptNo, &p.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	p.Date = dt.Format("2006-01-02")
	if notes != nil { p.Notes = *notes }
	if receiptNo != nil { p.ReceiptNo = *receiptNo }
	return &p, nil
}

// ── ONLINE PAYMENTS REPOSITORY METHODS ──────────────────────────────────────

func (r *PaymentRepository) GetAllOnlinePayments(status string) ([]models.OnlinePayment, error) {
	query := `
		SELECT id, loan_id, loan_no, customer_id, customer_name, customer_phone, customer_nic,
		       amount, payment_date, submitted_at, bank_name, reference_number, slip_url,
		       slip_file_name, slip_file_type, status, reviewed_by, reviewed_at, review_notes,
		       receipt_no, notes, payment_method, created_at, updated_at
		FROM online_payments
	`
	var rows *sql.Rows
	var err error
	if status != "" && status != "ALL" {
		query += ` WHERE status = $1 ORDER BY submitted_at DESC`
		rows, err = r.db.Query(query, status)
	} else {
		query += ` ORDER BY submitted_at DESC`
		rows, err = r.db.Query(query)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to query online payments: %w", err)
	}
	defer rows.Close()

	var list []models.OnlinePayment
	for rows.Next() {
		op, err := scanOnlinePayment(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *op)
	}
	return list, nil
}

func (r *PaymentRepository) GetOnlinePaymentByID(id string) (*models.OnlinePayment, error) {
	query := `
		SELECT id, loan_id, loan_no, customer_id, customer_name, customer_phone, customer_nic,
		       amount, payment_date, submitted_at, bank_name, reference_number, slip_url,
		       slip_file_name, slip_file_type, status, reviewed_by, reviewed_at, review_notes,
		       receipt_no, notes, payment_method, created_at, updated_at
		FROM online_payments
		WHERE id = $1
	`
	row := r.db.QueryRow(query, id)
	return scanOnlinePaymentRow(row)
}

func (r *PaymentRepository) CreateOnlinePayment(op *models.OnlinePayment) error {
	query := `
		INSERT INTO online_payments (
			id, loan_id, loan_no, customer_id, customer_name, customer_phone, customer_nic,
			amount, payment_date, submitted_at, bank_name, reference_number, slip_url,
			slip_file_name, slip_file_type, status, notes, payment_method, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW()
		)
	`
	_, err := r.db.Exec(query,
		op.ID, op.LoanID, op.LoanNo, op.CustomerID, op.CustomerName, op.CustomerPhone, op.CustomerNIC,
		op.Amount, op.PaymentDate, op.BankName, op.ReferenceNumber, op.SlipURL,
		op.SlipFileName, op.SlipFileType, op.Status, op.Notes, op.PaymentMethod,
	)
	return err
}

func (r *PaymentRepository) UpdateOnlinePaymentStatus(id, status, reviewer, notes, receiptNo string) error {
	query := `
		UPDATE online_payments
		SET status = $1, reviewed_by = $2, reviewed_at = CURRENT_DATE, review_notes = $3, receipt_no = $4, updated_at = NOW()
		WHERE id = $5
	`
	_, err := r.db.Exec(query, status, reviewer, notes, receiptNo, id)
	return err
}

func scanOnlinePayment(rows *sql.Rows) (*models.OnlinePayment, error) {
	var op models.OnlinePayment
	var loanNo, phone, nic, ref, fileName, fileType, reviewer, reviewedAt, revNotes, receiptNo, notes, method *string
	var dt time.Time

	err := rows.Scan(
		&op.ID, &op.LoanID, &loanNo, &op.CustomerID, &op.CustomerName, &phone, &nic,
		&op.Amount, &dt, &op.SubmittedAt, &op.BankName, &ref, &op.SlipURL,
		&fileName, &fileType, &op.Status, &reviewer, &reviewedAt, &revNotes,
		&receiptNo, &notes, &method, &op.CreatedAt, &op.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	op.PaymentDate = dt.Format("2006-01-02")
	if loanNo != nil { op.LoanNo = *loanNo }
	if phone != nil { op.CustomerPhone = *phone }
	if nic != nil { op.CustomerNIC = *nic }
	if ref != nil { op.ReferenceNumber = *ref }
	if fileName != nil { op.SlipFileName = *fileName }
	if fileType != nil { op.SlipFileType = *fileType }
	if reviewer != nil { op.ReviewedBy = *reviewer }
	if reviewedAt != nil { op.ReviewedAt = *reviewedAt }
	if revNotes != nil { op.ReviewNotes = *revNotes }
	if receiptNo != nil { op.ReceiptNo = *receiptNo }
	if notes != nil { op.Notes = *notes }
	if method != nil { op.PaymentMethod = *method }

	return &op, nil
}

func scanOnlinePaymentRow(row *sql.Row) (*models.OnlinePayment, error) {
	var op models.OnlinePayment
	var loanNo, phone, nic, ref, fileName, fileType, reviewer, reviewedAt, revNotes, receiptNo, notes, method *string
	var dt time.Time

	err := row.Scan(
		&op.ID, &op.LoanID, &loanNo, &op.CustomerID, &op.CustomerName, &phone, &nic,
		&op.Amount, &dt, &op.SubmittedAt, &op.BankName, &ref, &op.SlipURL,
		&fileName, &fileType, &op.Status, &reviewer, &reviewedAt, &revNotes,
		&receiptNo, &notes, &method, &op.CreatedAt, &op.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	op.PaymentDate = dt.Format("2006-01-02")
	if loanNo != nil { op.LoanNo = *loanNo }
	if phone != nil { op.CustomerPhone = *phone }
	if nic != nil { op.CustomerNIC = *nic }
	if ref != nil { op.ReferenceNumber = *ref }
	if fileName != nil { op.SlipFileName = *fileName }
	if fileType != nil { op.SlipFileType = *fileType }
	if reviewer != nil { op.ReviewedBy = *reviewer }
	if reviewedAt != nil { op.ReviewedAt = *reviewedAt }
	if revNotes != nil { op.ReviewNotes = *revNotes }
	if receiptNo != nil { op.ReceiptNo = *receiptNo }
	if notes != nil { op.Notes = *notes }
	if method != nil { op.PaymentMethod = *method }

	return &op, nil
}


