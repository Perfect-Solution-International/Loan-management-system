package models

import (
	"encoding/json"
	"time"
)

// Staff Permissions
type StaffPermissions struct {
	ApproveLoans     bool `json:"approveLoans"`
	RecordRepayments bool `json:"recordRepayments"`
	ExportReports    bool `json:"exportReports"`
	ManageSettings   bool `json:"manageSettings"`
	ManageCustomers  bool `json:"manageCustomers"`
}

// User / Staff Model
type User struct {
	ID           string           `json:"id"`
	Name         string           `json:"name"`
	Email        string           `json:"email"`
	PasswordHash string           `json:"-"`
	Password     string           `json:"password,omitempty"`
	Role         string           `json:"role"` // Administrator, Loan Officer, Collection Agent, Auditor
	Branch       string           `json:"branch"`
	Status       string           `json:"status"` // Active, Inactive
	JoinedDate   string           `json:"joinedDate"`
	Permissions  StaffPermissions `json:"permissions"`
	CreatedAt    time.Time        `json:"createdAt"`
	UpdatedAt    time.Time        `json:"updatedAt"`
}

// Customer Document
type CustomerDocument struct {
	ID         string `json:"id"`
	CustomerID string `json:"customerId"`
	Title      string `json:"title"`
	Type       string `json:"type"` // photo, nic_front, nic_back, salary_slip, agreement, utility_bill, other
	FileName   string `json:"fileName"`
	FileSize   string `json:"fileSize"`
	FileType   string `json:"fileType"`
	FileURL    string `json:"fileUrl"`
	UploadedAt string `json:"uploadedAt"`
	Uploader   string `json:"uploader,omitempty"`
}

// Customer Model
type Customer struct {
	Password                  string             `json:"password,omitempty"`
	PasswordHash              string             `json:"-"`
	Username                  string             `json:"username,omitempty"`
	ID                        string             `json:"id"`
	Name                      string             `json:"name"`
	FullName                  string             `json:"fullName,omitempty"`
	NIC                       string             `json:"nic"`
	Phone                     string             `json:"phone"`
	AlternatePhone            string             `json:"alternatePhone,omitempty"`
	Email                     string             `json:"email,omitempty"`
	DOB                       string             `json:"dob,omitempty"`
	Gender                    string             `json:"gender,omitempty"`
	PrimaryContact            string             `json:"primaryContact,omitempty"`
	Address                   string             `json:"address"`
	Village                   string             `json:"village,omitempty"`
	Town                      string             `json:"town"`
	District                  string             `json:"district"`
	Occupation                string             `json:"occupation,omitempty"`
	MonthlyIncome             float64            `json:"monthlyIncome"`
	EmergencyContact          string             `json:"emergencyContact,omitempty"`
	GuarantorName             string             `json:"guarantorName,omitempty"`
	GuarantorNIC              string             `json:"guarantorNic,omitempty"`
	GuarantorPhone            string             `json:"guarantorPhone,omitempty"`
	GuarantorRelationship     string             `json:"guarantorRelationship,omitempty"`
	Status                    string             `json:"status"` // Active, Inactive, Suspended
	RegisteredAt              string             `json:"registeredAt"`
	PhotoURL                  string             `json:"photoUrl,omitempty"`
	NICFrontURL               string             `json:"nicFrontUrl,omitempty"`
	NICBackURL                string             `json:"nicBackUrl,omitempty"`
	Documents                 []CustomerDocument `json:"documents,omitempty"`
	HasExistingLoan           bool               `json:"hasExistingLoan"`
	ExistingLoanNotes         string             `json:"existingLoanNotes,omitempty"`
	PriorRepaymentHistory     string             `json:"priorRepaymentHistory,omitempty"`
	InitialOutstandingBalance float64            `json:"initialOutstandingBalance"`
	CreatedAt                 time.Time          `json:"createdAt"`
	UpdatedAt                 time.Time          `json:"updatedAt"`
}

// Loan Model
type Loan struct {
	ID                    string    `json:"id"`
	CustomerID            string    `json:"customerId"`
	CustomerName          string    `json:"customerName,omitempty"`
	LoanNo                string    `json:"loanNo"`
	Amount                float64   `json:"amount"`
	Principal             float64   `json:"principal"`
	CapitalDeduction      float64   `json:"capitalDeduction"`
	InterestDeduction     float64   `json:"interestDeduction"`
	OtherFees             float64   `json:"otherFees"`
	InterestRate          float64   `json:"interestRate"`
	RatePeriod            string    `json:"ratePeriod"`         // Daily, Weekly, Monthly, Flat
	RepaymentFrequency    string    `json:"repaymentFrequency"` // Daily, Weekly, Monthly
	RepaymentType         string    `json:"repaymentType"`      // Capital + Interest, Interest Only
	Duration              int       `json:"duration"`
	IssueDate             string    `json:"issueDate"`
	FirstPaymentDate      string    `json:"firstPaymentDate"`
	Purpose               string    `json:"purpose,omitempty"`
	Status                string    `json:"status"` // Pending, Active, Completed, Rejected, Overdue
	Interest              float64   `json:"interest"`
	TotalRepayment        float64   `json:"totalRepayment"`
	NetDisbursement       float64   `json:"netDisbursement"`
	Installment           float64   `json:"installment"`
	GuarantorName         string    `json:"guarantorName,omitempty"`
	GuarantorNIC          string    `json:"guarantorNic,omitempty"`
	GuarantorPhone        string    `json:"guarantorPhone,omitempty"`
	GuarantorRelationship string    `json:"guarantorRelationship,omitempty"`
	GuarantorAddress      string    `json:"guarantorAddress,omitempty"`
	DisbursementMethod    string    `json:"disbursementMethod,omitempty"`
	ApprovedBy            string    `json:"approvedBy,omitempty"`
	ApprovedAt            string    `json:"approvedAt,omitempty"`
	Notes                 string    `json:"notes,omitempty"`
	CreatedAt             time.Time `json:"createdAt"`
	UpdatedAt             time.Time `json:"updatedAt"`
}

// Payment / Repayment Model
type Payment struct {
	ID          string    `json:"id"`
	LoanID      string    `json:"loanId"`
	CustomerID  string    `json:"customerId"`
	Amount      float64   `json:"amount"`
	Date        string    `json:"date"`
	Type        string    `json:"type"` // Capital, Interest, Other
	Notes       string    `json:"notes,omitempty"`
	Method      string    `json:"method"` // Cash, Bank Transfer, Cheque
	CollectedBy string    `json:"collectedBy"`
	ReceiptNo   string    `json:"receiptNo,omitempty"`
	CreatedAt   time.Time `json:"createdAt"`
}

// Online Payment Slip Model
type OnlinePayment struct {
	ID              string    `json:"id"`
	LoanID          string    `json:"loanId"`
	LoanNo          string    `json:"loanNo,omitempty"`
	CustomerID      string    `json:"customerId"`
	CustomerName    string    `json:"customerName"`
	CustomerPhone   string    `json:"customerPhone,omitempty"`
	CustomerNIC     string    `json:"customerNic,omitempty"`
	Amount          float64   `json:"amount"`
	PaymentDate     string    `json:"paymentDate"`
	SubmittedAt     string    `json:"submittedAt"`
	BankName        string    `json:"bankName"`
	ReferenceNumber string    `json:"referenceNumber,omitempty"`
	SlipURL         string    `json:"slipUrl"`
	SlipFileName    string    `json:"slipFileName,omitempty"`
	SlipFileType    string    `json:"slipFileType,omitempty"`
	Status          string    `json:"status"` // PENDING, COMPLETED, REJECTED
	ReviewedBy      string    `json:"reviewedBy,omitempty"`
	ReviewedAt      string    `json:"reviewedAt,omitempty"`
	ReviewNotes     string    `json:"reviewNotes,omitempty"`
	ReceiptNo       string    `json:"receiptNo,omitempty"`
	Notes           string    `json:"notes,omitempty"`
	PaymentMethod   string    `json:"paymentMethod,omitempty"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

// Audit Log Model
type AuditLog struct {
	ID        string    `json:"id"`
	Timestamp time.Time `json:"timestamp"`
	UserName  string    `json:"userName"`
	UserRole  string    `json:"userRole"`
	Action    string    `json:"action"`
	Module    string    `json:"module"`
	Details   string    `json:"details"`
	IPAddress string    `json:"ipAddress,omitempty"`
	Severity  string    `json:"severity"` // INFO, WARNING, CRITICAL
	CreatedAt time.Time `json:"createdAt"`
}

// System Settings Model
type SystemSettings struct {
	ID                             int       `json:"id"`
	SystemName                     string    `json:"systemName"`
	Currency                       string    `json:"currency"`
	DefaultMonthlyRate             float64   `json:"defaultMonthlyRate"`
	DefaultWeeklyRate              float64   `json:"defaultWeeklyRate"`
	DefaultDailyRate               float64   `json:"defaultDailyRate"`
	DefaultCapitalDeductionRate    float64   `json:"defaultCapitalDeductionRate"`
	DefaultInterestDeductionMethod string    `json:"defaultInterestDeductionMethod"`
	DefaultProcessingFee           float64   `json:"defaultProcessingFee"`
	DefaultAdminFee                float64   `json:"defaultAdminFee"`
	LateFeePercentage              float64   `json:"lateFeePercentage"`
	GracePeriodDays                int       `json:"gracePeriodDays"`
	UpdatedAt                      time.Time `json:"updatedAt"`
}

// Helper methods to serialize/deserialize JSONB
func (p StaffPermissions) Value() ([]byte, error) {
	return json.Marshal(p)
}

func (p *StaffPermissions) Scan(src interface{}) error {
	bytes, ok := src.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, p)
}
