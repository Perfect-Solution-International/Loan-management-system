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

