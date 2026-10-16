package repository

import (
	"database/sql"
	"fmt"
	"time"

	"loan-management-backend/database"
	"loan-management-backend/models"
)

type LoanRepository struct {
	db *database.DB
}

func NewLoanRepository(db *database.DB) *LoanRepository {
	return &LoanRepository{db: db}
}

func (r *LoanRepository) GetAll() ([]models.Loan, error) {
	query := `
		SELECT 
			l.id, l.customer_id, COALESCE(l.customer_name, c.name, '') as customer_name,
			l.loan_no, l.amount, l.principal, l.capital_deduction, l.interest_deduction, l.other_fees,
			l.interest_rate, l.rate_period, l.repayment_frequency, l.repayment_type, l.duration,
			l.issue_date, l.first_payment_date, l.purpose, l.status, l.interest, l.total_repayment,
			l.net_disbursement, l.installment, l.guarantor_name, l.guarantor_nic, l.guarantor_phone,
			l.guarantor_relationship, l.guarantor_address, l.disbursement_method, l.approved_by,
			l.approved_at, l.notes, l.created_at, l.updated_at
		FROM loans l
		LEFT JOIN customers c ON l.customer_id = c.id
		ORDER BY l.issue_date DESC, l.created_at DESC
	`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query loans: %w", err)
	}
	defer rows.Close()

	var loans []models.Loan
	for rows.Next() {
		loan, err := scanLoan(rows)
		if err != nil {
			return nil, err
		}
		loans = append(loans, *loan)
	}

	return loans, nil
}

func (r *LoanRepository) GetByID(id string) (*models.Loan, error) {
	query := `
		SELECT 
			l.id, l.customer_id, COALESCE(l.customer_name, c.name, '') as customer_name,
			l.loan_no, l.amount, l.principal, l.capital_deduction, l.interest_deduction, l.other_fees,
			l.interest_rate, l.rate_period, l.repayment_frequency, l.repayment_type, l.duration,
			l.issue_date, l.first_payment_date, l.purpose, l.status, l.interest, l.total_repayment,
			l.net_disbursement, l.installment, l.guarantor_name, l.guarantor_nic, l.guarantor_phone,
			l.guarantor_relationship, l.guarantor_address, l.disbursement_method, l.approved_by,
			l.approved_at, l.notes, l.created_at, l.updated_at
		FROM loans l
		LEFT JOIN customers c ON l.customer_id = c.id
		WHERE l.id = $1
	`
	row := r.db.QueryRow(query, id)
	return scanLoanRow(row)
}

func (r *LoanRepository) GetByCustomerID(customerID string) ([]models.Loan, error) {
	query := `
		SELECT 
			l.id, l.customer_id, COALESCE(l.customer_name, c.name, '') as customer_name,
			l.loan_no, l.amount, l.principal, l.capital_deduction, l.interest_deduction, l.other_fees,
			l.interest_rate, l.rate_period, l.repayment_frequency, l.repayment_type, l.duration,
			l.issue_date, l.first_payment_date, l.purpose, l.status, l.interest, l.total_repayment,
			l.net_disbursement, l.installment, l.guarantor_name, l.guarantor_nic, l.guarantor_phone,
			l.guarantor_relationship, l.guarantor_address, l.disbursement_method, l.approved_by,
			l.approved_at, l.notes, l.created_at, l.updated_at
		FROM loans l
		LEFT JOIN customers c ON l.customer_id = c.id
		WHERE l.customer_id = $1
		ORDER BY l.issue_date DESC
	`
	rows, err := r.db.Query(query, customerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var loans []models.Loan
	for rows.Next() {
		loan, err := scanLoan(rows)
		if err != nil {
			return nil, err
		}
		loans = append(loans, *loan)
	}
	return loans, nil
}

func (r *LoanRepository) Create(l *models.Loan) error {
	query := `
		INSERT INTO loans (
			id, customer_id, customer_name, loan_no, amount, principal, capital_deduction,
			interest_deduction, other_fees, interest_rate, rate_period, repayment_frequency,
			repayment_type, duration, issue_date, first_payment_date, purpose, status,
			interest, total_repayment, net_disbursement, installment, guarantor_name,
			guarantor_nic, guarantor_phone, guarantor_relationship, guarantor_address,
			disbursement_method, approved_by, approved_at, notes, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7,
			$8, $9, $10, $11, $12,
			$13, $14, $15, $16, $17, $18,
			$19, $20, $21, $22, $23,
			$24, $25, $26, $27,
			$28, $29, $30, $31, NOW(), NOW()
		)
	`
	var appAt interface{} = nil
	if l.ApprovedAt != "" {
		appAt = l.ApprovedAt
	}

	_, err := r.db.Exec(query,
		l.ID, l.CustomerID, l.CustomerName, l.LoanNo, l.Amount, l.Principal, l.CapitalDeduction,
		l.InterestDeduction, l.OtherFees, l.InterestRate, l.RatePeriod, l.RepaymentFrequency,
		l.RepaymentType, l.Duration, l.IssueDate, l.FirstPaymentDate, l.Purpose, l.Status,
		l.Interest, l.TotalRepayment, l.NetDisbursement, l.Installment, l.GuarantorName,
		l.GuarantorNIC, l.GuarantorPhone, l.GuarantorRelationship, l.GuarantorAddress,
		l.DisbursementMethod, l.ApprovedBy, appAt, l.Notes,
	)
	return err
}

func (r *LoanRepository) UpdateStatus(id string, status string, approvedBy string) error {
	query := `
		UPDATE loans SET
			status = $2,
			approved_by = CASE WHEN $3 <> '' THEN $3 ELSE approved_by END,
			approved_at = CASE WHEN $3 <> '' THEN NOW() ELSE approved_at END,
			updated_at = NOW()
		WHERE id = $1
	`
	_, err := r.db.Exec(query, id, status, approvedBy)
	return err
}

func scanLoan(rows *sql.Rows) (*models.Loan, error) {
	var l models.Loan
	var custName, purpose, repType, gName, gNIC, gPhone, gRel, gAddr, disbMethod, appBy, notes *string
	var issueDate, firstPaymentDate time.Time
	var appAt *time.Time

	err := rows.Scan(
		&l.ID, &l.CustomerID, &custName, &l.LoanNo, &l.Amount, &l.Principal, &l.CapitalDeduction,
		&l.InterestDeduction, &l.OtherFees, &l.InterestRate, &l.RatePeriod, &l.RepaymentFrequency,
		&repType, &l.Duration, &issueDate, &firstPaymentDate, &purpose, &l.Status,
		&l.Interest, &l.TotalRepayment, &l.NetDisbursement, &l.Installment, &gName,
		&gNIC, &gPhone, &gRel, &gAddr, &disbMethod, &appBy,
		&appAt, &notes, &l.CreatedAt, &l.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	applyLoanPointers(&l, custName, purpose, repType, gName, gNIC, gPhone, gRel, gAddr, disbMethod, appBy, notes, issueDate, firstPaymentDate, appAt)
	return &l, nil
}

func scanLoanRow(row *sql.Row) (*models.Loan, error) {
	var l models.Loan
	var custName, purpose, repType, gName, gNIC, gPhone, gRel, gAddr, disbMethod, appBy, notes *string
	var issueDate, firstPaymentDate time.Time
	var appAt *time.Time

	err := row.Scan(
		&l.ID, &l.CustomerID, &custName, &l.LoanNo, &l.Amount, &l.Principal, &l.CapitalDeduction,
		&l.InterestDeduction, &l.OtherFees, &l.InterestRate, &l.RatePeriod, &l.RepaymentFrequency,
		&repType, &l.Duration, &issueDate, &firstPaymentDate, &purpose, &l.Status,
		&l.Interest, &l.TotalRepayment, &l.NetDisbursement, &l.Installment, &gName,
		&gNIC, &gPhone, &gRel, &gAddr, &disbMethod, &appBy,
		&appAt, &notes, &l.CreatedAt, &l.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	applyLoanPointers(&l, custName, purpose, repType, gName, gNIC, gPhone, gRel, gAddr, disbMethod, appBy, notes, issueDate, firstPaymentDate, appAt)
	return &l, nil
}

func applyLoanPointers(l *models.Loan, custName, purpose, repType, gName, gNIC, gPhone, gRel, gAddr, disbMethod, appBy, notes *string, issueDate, firstPaymentDate time.Time, appAt *time.Time) {
	if custName != nil { l.CustomerName = *custName }
	if purpose != nil { l.Purpose = *purpose }
	if repType != nil { l.RepaymentType = *repType }
	if gName != nil { l.GuarantorName = *gName }
	if gNIC != nil { l.GuarantorNIC = *gNIC }
	if gPhone != nil { l.GuarantorPhone = *gPhone }
	if gRel != nil { l.GuarantorRelationship = *gRel }
	if gAddr != nil { l.GuarantorAddress = *gAddr }
	if disbMethod != nil { l.DisbursementMethod = *disbMethod }
	if appBy != nil { l.ApprovedBy = *appBy }
	if notes != nil { l.Notes = *notes }
	l.IssueDate = issueDate.Format("2006-01-02")
	l.FirstPaymentDate = firstPaymentDate.Format("2006-01-02")
	if appAt != nil {
		l.ApprovedAt = appAt.Format(time.RFC3339)
	}
}

