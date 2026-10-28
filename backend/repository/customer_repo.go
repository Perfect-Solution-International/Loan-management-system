package repository

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"loan-management-backend/database"
	"loan-management-backend/models"
)

type CustomerRepository struct {
	db *database.DB
}

func NewCustomerRepository(db *database.DB) *CustomerRepository {
	return &CustomerRepository{db: db}
}

func (r *CustomerRepository) GetAll() ([]models.Customer, error) {
	query := `
		SELECT 
			id, name, full_name, nic, phone, alternate_phone, email, dob, gender,
			primary_contact, address, village, town, district, occupation, monthly_income,
			emergency_contact, guarantor_name, guarantor_nic, guarantor_phone, guarantor_relationship,
			status, registered_at, photo_url, nic_front_url, nic_back_url, documents,
			has_existing_loan, existing_loan_notes, prior_repayment_history, initial_outstanding_balance,
			created_at, updated_at
		FROM customers
		ORDER BY registered_at DESC, created_at DESC
	`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query customers: %w", err)
	}
	defer rows.Close()

	customers := make([]models.Customer, 0)
	for rows.Next() {
		c, err := scanCustomer(rows)
		if err != nil {
			return nil, err
		}
		customers = append(customers, *c)
	}

	return customers, rows.Err()
}

func (r *CustomerRepository) GetByID(id string) (*models.Customer, error) {
	query := `
		SELECT 
			id, name, full_name, nic, phone, alternate_phone, email, dob, gender,
			primary_contact, address, village, town, district, occupation, monthly_income,
			emergency_contact, guarantor_name, guarantor_nic, guarantor_phone, guarantor_relationship,
			status, registered_at, photo_url, nic_front_url, nic_back_url, documents,
			has_existing_loan, existing_loan_notes, prior_repayment_history, initial_outstanding_balance,
			created_at, updated_at
		FROM customers
		WHERE id = $1
	`
	row := r.db.QueryRow(query, id)
	return scanCustomerRow(row)
}

func (r *CustomerRepository) GetByNIC(nic string) (*models.Customer, error) {
	query := `
		SELECT 
			id, name, full_name, nic, phone, alternate_phone, email, dob, gender,
			primary_contact, address, village, town, district, occupation, monthly_income,
			emergency_contact, guarantor_name, guarantor_nic, guarantor_phone, guarantor_relationship,
			status, registered_at, photo_url, nic_front_url, nic_back_url, documents,
			has_existing_loan, existing_loan_notes, prior_repayment_history, initial_outstanding_balance,
			created_at, updated_at
		FROM customers
		WHERE LOWER(nic) = LOWER($1)
	`
	row := r.db.QueryRow(query, nic)
	return scanCustomerRow(row)
}

func (r *CustomerRepository) Create(c *models.Customer) error {
	query := `
		INSERT INTO customers (
			id, name, full_name, nic, phone, alternate_phone, email, dob, gender,
			primary_contact, address, village, town, district, occupation, monthly_income,
			emergency_contact, guarantor_name, guarantor_nic, guarantor_phone, guarantor_relationship,
			status, registered_at, photo_url, nic_front_url, nic_back_url, documents,
			has_existing_loan, existing_loan_notes, prior_repayment_history, initial_outstanding_balance,
			password_hash, username, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9,
			$10, $11, $12, $13, $14, $15, $16,
			$17, $18, $19, $20, $21,
			$22, $23, $24, $25, $26, $27,
			$28, $29, $30, $31,
			 $32, NULLIF($33,''), NOW(), NOW()
		)
	`

	docsJSON, _ := json.Marshal(c.Documents)
	if len(c.Documents) == 0 {
		docsJSON = []byte("[]")
	}

	var dobVal interface{} = nil
	if c.DOB != "" {
		dobVal = c.DOB
	}

	_, err := r.db.Exec(query,
		c.ID, c.Name, c.FullName, c.NIC, c.Phone, c.AlternatePhone, c.Email, dobVal, c.Gender,
		c.PrimaryContact, c.Address, c.Village, c.Town, c.District, c.Occupation, c.MonthlyIncome,
		c.EmergencyContact, c.GuarantorName, c.GuarantorNIC, c.GuarantorPhone, c.GuarantorRelationship,
		c.Status, c.RegisteredAt, c.PhotoURL, c.NICFrontURL, c.NICBackURL, docsJSON,
		c.HasExistingLoan, c.ExistingLoanNotes, c.PriorRepaymentHistory, c.InitialOutstandingBalance, c.PasswordHash, c.Username,
	)
	return err
}

func (r *CustomerRepository) Update(c *models.Customer) error {
	query := `
		UPDATE customers SET
			name = $2, full_name = $3, nic = $4, phone = $5, alternate_phone = $6, email = $7,
			dob = $8, gender = $9, primary_contact = $10, address = $11, village = $12,
			town = $13, district = $14, occupation = $15, monthly_income = $16,
			emergency_contact = $17, guarantor_name = $18, guarantor_nic = $19,
			guarantor_phone = $20, guarantor_relationship = $21, status = $22,
			photo_url = $23, nic_front_url = $24, nic_back_url = $25, documents = $26,
			has_existing_loan = $27, existing_loan_notes = $28, prior_repayment_history = $29,
			initial_outstanding_balance = $30, password_hash=CASE WHEN $31='' THEN password_hash ELSE $31 END, updated_at = NOW()
		WHERE id = $1
	`
	docsJSON, _ := json.Marshal(c.Documents)
	var dobVal interface{} = nil
	if c.DOB != "" {
		dobVal = c.DOB
	}

	_, err := r.db.Exec(query,
		c.ID, c.Name, c.FullName, c.NIC, c.Phone, c.AlternatePhone, c.Email,
		dobVal, c.Gender, c.PrimaryContact, c.Address, c.Village,
		c.Town, c.District, c.Occupation, c.MonthlyIncome,
		c.EmergencyContact, c.GuarantorName, c.GuarantorNIC,
		c.GuarantorPhone, c.GuarantorRelationship, c.Status,
		c.PhotoURL, c.NICFrontURL, c.NICBackURL, docsJSON,
		c.HasExistingLoan, c.ExistingLoanNotes, c.PriorRepaymentHistory,
		c.InitialOutstandingBalance, c.PasswordHash,
	)
	return err
}

func (r *CustomerRepository) Delete(id string) error {
	_, err := r.db.Exec("DELETE FROM customers WHERE id = $1", id)
	return err
}

func scanCustomer(rows *sql.Rows) (*models.Customer, error) {
	var c models.Customer
	var dob, regAt *time.Time
	var fullName, altPhone, email, gender, primaryContact, village, occupation, emContact *string
	var gName, gNIC, gPhone, gRel, photoURL, nicFURL, nicBURL, notes, hist *string
	var docsJSON []byte

	err := rows.Scan(
		&c.ID, &c.Name, &fullName, &c.NIC, &c.Phone, &altPhone, &email, &dob, &gender,
		&primaryContact, &c.Address, &village, &c.Town, &c.District, &occupation, &c.MonthlyIncome,
		&emContact, &gName, &gNIC, &gPhone, &gRel,
		&c.Status, &regAt, &photoURL, &nicFURL, &nicBURL, &docsJSON,
		&c.HasExistingLoan, &notes, &hist, &c.InitialOutstandingBalance,
		&c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	applyCustomerPointers(&c, fullName, altPhone, email, dob, gender, primaryContact, village, occupation, emContact, gName, gNIC, gPhone, gRel, photoURL, nicFURL, nicBURL, notes, hist, regAt, docsJSON)
	return &c, nil
}

func scanCustomerRow(row *sql.Row) (*models.Customer, error) {
	var c models.Customer
	var dob, regAt *time.Time
	var fullName, altPhone, email, gender, primaryContact, village, occupation, emContact *string
	var gName, gNIC, gPhone, gRel, photoURL, nicFURL, nicBURL, notes, hist *string
	var docsJSON []byte

	err := row.Scan(
		&c.ID, &c.Name, &fullName, &c.NIC, &c.Phone, &altPhone, &email, &dob, &gender,
		&primaryContact, &c.Address, &village, &c.Town, &c.District, &occupation, &c.MonthlyIncome,
		&emContact, &gName, &gNIC, &gPhone, &gRel,
		&c.Status, &regAt, &photoURL, &nicFURL, &nicBURL, &docsJSON,
		&c.HasExistingLoan, &notes, &hist, &c.InitialOutstandingBalance,
		&c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	applyCustomerPointers(&c, fullName, altPhone, email, dob, gender, primaryContact, village, occupation, emContact, gName, gNIC, gPhone, gRel, photoURL, nicFURL, nicBURL, notes, hist, regAt, docsJSON)
	return &c, nil
}

func applyCustomerPointers(c *models.Customer, fullName, altPhone, email *string, dob *time.Time, gender, primaryContact, village, occupation, emContact, gName, gNIC, gPhone, gRel, photoURL, nicFURL, nicBURL, notes, hist *string, regAt *time.Time, docsJSON []byte) {
	if fullName != nil {
		c.FullName = *fullName
	}
	if altPhone != nil {
		c.AlternatePhone = *altPhone
	}
	if email != nil {
		c.Email = *email
	}
	if dob != nil {
		c.DOB = dob.Format("2006-01-02")
	}
	if gender != nil {
		c.Gender = *gender
	}
	if primaryContact != nil {
		c.PrimaryContact = *primaryContact
	}
	if village != nil {
		c.Village = *village
	}
	if occupation != nil {
		c.Occupation = *occupation
	}
	if emContact != nil {
		c.EmergencyContact = *emContact
	}
	if gName != nil {
		c.GuarantorName = *gName
	}
	if gNIC != nil {
		c.GuarantorNIC = *gNIC
	}
	if gPhone != nil {
		c.GuarantorPhone = *gPhone
	}
	if gRel != nil {
		c.GuarantorRelationship = *gRel
	}
	if photoURL != nil {
		c.PhotoURL = *photoURL
	}
	if nicFURL != nil {
		c.NICFrontURL = *nicFURL
	}
	if nicBURL != nil {
		c.NICBackURL = *nicBURL
	}
	if notes != nil {
		c.ExistingLoanNotes = *notes
	}
	if hist != nil {
		c.PriorRepaymentHistory = *hist
	}
	if regAt != nil {
		c.RegisteredAt = regAt.Format("2006-01-02")
	}
	if len(docsJSON) > 0 {
		_ = json.Unmarshal(docsJSON, &c.Documents)
	}
}
