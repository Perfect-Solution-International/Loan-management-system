package repository

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"loan-management-backend/models"
	"time"
)

var ErrConflict = errors.New("record has already been processed or conflicts with existing data")

type LoanNote struct {
	PromiseDate string    `json:"promiseDate"`
	Note        string    `json:"note"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

func (r *LoanRepository) GetNotes() (map[string]LoanNote, error) {
	rows, err := r.db.Query(`SELECT loan_id,promise_date,note,updated_at FROM loan_notes`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	notes := map[string]LoanNote{}
	for rows.Next() {
		var id string
		var date time.Time
		var note LoanNote
		if err = rows.Scan(&id, &date, &note.Note, &note.UpdatedAt); err != nil {
			return nil, err
		}
		note.PromiseDate = date.Format("2006-01-02")
		notes[id] = note
	}
	return notes, rows.Err()
}

func (r *LoanRepository) SaveNote(id string, note *LoanNote) error {
	return r.db.QueryRow(`INSERT INTO loan_notes(loan_id,promise_date,note) VALUES($1,$2,$3)
 ON CONFLICT(loan_id) DO UPDATE SET promise_date=EXCLUDED.promise_date,note=EXCLUDED.note,updated_at=NOW() RETURNING updated_at`, id, note.PromiseDate, note.Note).Scan(&note.UpdatedAt)
}

func (r *LoanRepository) DeleteApplication(id string) error {
	result, err := r.db.Exec(`DELETE FROM loans WHERE id=$1 AND status IN ('Pending','Rejected') AND NOT EXISTS(SELECT 1 FROM payments WHERE loan_id=$1) AND NOT EXISTS(SELECT 1 FROM online_payments WHERE loan_id=$1)`, id)
	if err != nil {
		return err
	}
	n, err := result.RowsAffected()
	if n == 0 && err == nil {
		return ErrConflict
	}
	return err
}

func (r *UserRepository) Update(u *models.User) error {
	perms, err := json.Marshal(u.Permissions)
	if err != nil {
		return err
	}
	result, err := r.db.Exec(`UPDATE users SET name=$2,email=$3,role=$4,branch=$5,status=$6,permissions=$7,
 password_hash=CASE WHEN $8='' THEN password_hash ELSE $8 END,updated_at=NOW() WHERE id=$1`,
		u.ID, u.Name, u.Email, u.Role, u.Branch, u.Status, perms, u.PasswordHash)
	return affected(result, err)
}

func affected(result sql.Result, err error) error {
	if err != nil {
		return err
	}
	n, err := result.RowsAffected()
	if err == nil && n == 0 {
		return sql.ErrNoRows
	}
	return err
}

func (r *CustomerRepository) Credentials(identifier string) (string, string, error) {
	var id, hash string
	err := r.db.QueryRow(`SELECT id,password_hash FROM customers WHERE LOWER(id)=LOWER($1) OR LOWER(nic)=LOWER($1)
 OR LOWER(email)=LOWER($1) OR LOWER(username)=LOWER($1) OR phone=$1 ORDER BY id LIMIT 1`, identifier).Scan(&id, &hash)
	return id, hash, err
}

func (r *CustomerRepository) AddDocument(id string, doc models.CustomerDocument) error {
	data, err := json.Marshal([]models.CustomerDocument{doc})
	if err != nil {
		return err
	}
	result, err := r.db.Exec(`UPDATE customers SET documents=COALESCE(documents,'[]'::jsonb) || $2::jsonb,updated_at=NOW() WHERE id=$1`, id, data)
	return affected(result, err)
}

func (r *CustomerRepository) DeleteDocument(customerID, id string) error {
	result, err := r.db.Exec(`UPDATE customers SET documents=COALESCE((SELECT jsonb_agg(doc) FROM jsonb_array_elements(documents) doc WHERE doc->>'id'<>$2),'[]'::jsonb),updated_at=NOW() WHERE id=$1 AND documents @> jsonb_build_array(jsonb_build_object('id',$2::text))`, customerID, id)
	return affected(result, err)
}

func (r *PaymentRepository) NextReceipt() (string, error) {
	var n int64
	err := r.db.QueryRow(`SELECT nextval('receipt_number_seq')`).Scan(&n)
	return fmt.Sprintf("REC-%d-%04d", time.Now().Year(), n), err
}

func (r *PaymentRepository) GetByID(id string) (*models.Payment, error) {
	var p models.Payment
	var date time.Time
	err := r.db.QueryRow(`SELECT id,loan_id,customer_id,amount,date,type,COALESCE(notes,''),method,collected_by,COALESCE(receipt_no,''),created_at FROM payments WHERE id=$1`, id).Scan(
		&p.ID, &p.LoanID, &p.CustomerID, &p.Amount, &date, &p.Type, &p.Notes, &p.Method, &p.CollectedBy, &p.ReceiptNo, &p.CreatedAt)
	p.Date = date.Format("2006-01-02")
	return &p, err
}

// All ledger mutations lock the loan and update its status in the same transaction.
func settleLoan(tx *sql.Tx, id string) error {
	_, err := tx.Exec(`UPDATE loans SET status=CASE
 WHEN COALESCE((SELECT SUM(amount) FROM payments WHERE loan_id=$1),0)>=total_repayment AND total_repayment>0 THEN 'Completed'
 WHEN status='Completed' THEN 'Active' ELSE status END,updated_at=NOW() WHERE id=$1 AND status IN ('Active','Overdue','Completed')`, id)
	return err
}

func (r *PaymentRepository) MutatePayment(p *models.Payment, action string) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	var status string
	if err = tx.QueryRow(`SELECT status FROM loans WHERE id=$1 FOR UPDATE`, p.LoanID).Scan(&status); err != nil {
		return err
	}
	if status == "Pending" || status == "Rejected" {
		return errors.New("loan is not disbursed")
	}
	switch action {
	case "create":
		_, err = tx.Exec(`INSERT INTO payments(id,loan_id,customer_id,amount,date,type,notes,method,collected_by,receipt_no) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, p.ID, p.LoanID, p.CustomerID, p.Amount, p.Date, p.Type, p.Notes, p.Method, p.CollectedBy, p.ReceiptNo)
	case "update":
		var result sql.Result
		result, err = tx.Exec(`UPDATE payments SET amount=$2,date=$3,type=$4,notes=$5,method=$6 WHERE id=$1`, p.ID, p.Amount, p.Date, p.Type, p.Notes, p.Method)
		err = affected(result, err)
	case "delete":
		var result sql.Result
		result, err = tx.Exec(`DELETE FROM payments WHERE id=$1`, p.ID)
		err = affected(result, err)
	}
	if err != nil {
		return err
	}
	if err = settleLoan(tx, p.LoanID); err != nil {
		return err
	}
	return tx.Commit()
}

// Locking the slip prevents concurrent approvals from crediting the loan twice.
func (r *PaymentRepository) ReviewOnlinePayment(id, reviewer, notes string, approve bool) (*models.Payment, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	var status, loanID, customerID string
	var amount float64
	var date time.Time
	err = tx.QueryRow(`SELECT status,loan_id,customer_id,amount,payment_date FROM online_payments WHERE id=$1 FOR UPDATE`, id).Scan(&status, &loanID, &customerID, &amount, &date)
	if err != nil {
		return nil, err
	}
	if status != "PENDING" {
		return nil, ErrConflict
	}
	target := "REJECTED"
	receipt := ""
	var payment *models.Payment
	if approve {
		var loanStatus string
		if err = tx.QueryRow(`SELECT status FROM loans WHERE id=$1 FOR UPDATE`, loanID).Scan(&loanStatus); err != nil {
			return nil, err
		}
		if loanStatus != "Active" && loanStatus != "Overdue" {
			return nil, ErrConflict
		}
		var n int64
		if err = tx.QueryRow(`SELECT nextval('receipt_number_seq')`).Scan(&n); err != nil {
			return nil, err
		}
		receipt = fmt.Sprintf("REC-%d-%04d", time.Now().Year(), n)
		payment = &models.Payment{ID: "PAY-" + id, LoanID: loanID, CustomerID: customerID, Amount: amount, Date: date.Format("2006-01-02"), Type: "Capital", Method: "Bank Transfer", Notes: notes, CollectedBy: reviewer, ReceiptNo: receipt}
		_, err = tx.Exec(`INSERT INTO payments(id,loan_id,customer_id,amount,date,type,method,notes,collected_by,receipt_no) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, payment.ID, loanID, customerID, amount, payment.Date, payment.Type, payment.Method, notes, reviewer, receipt)
		if err != nil {
			return nil, err
		}
		if err = settleLoan(tx, loanID); err != nil {
			return nil, err
		}
		target = "COMPLETED"
	}
	_, err = tx.Exec(`UPDATE online_payments SET status=$2,reviewed_by=$3,reviewed_at=CURRENT_DATE,review_notes=$4,receipt_no=$5,updated_at=NOW() WHERE id=$1`, id, target, reviewer, notes, receipt)
	if err != nil {
		return nil, err
	}
	return payment, tx.Commit()
}

func (r *LoanRepository) Decide(id, status, approver string, notes *string) error {
	result, err := r.db.Exec(`UPDATE loans SET status=$2,approved_by=$3,approved_at=NOW(),notes=COALESCE($4,notes),updated_at=NOW() WHERE id=$1 AND status='Pending'`, id, status, approver, notes)
	if err != nil {
		return err
	}
	n, err := result.RowsAffected()
	if n == 0 && err == nil {
		return ErrConflict
	}
	return err
}
