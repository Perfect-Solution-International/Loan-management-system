package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"loan-management-backend/middleware"
	"loan-management-backend/models"
	"loan-management-backend/repository"
)

type PaymentHandler struct {
	payRepo   *repository.PaymentRepository
	loanRepo  *repository.LoanRepository
	auditRepo *repository.AuditRepository
}

func NewPaymentHandler(payRepo *repository.PaymentRepository, loanRepo *repository.LoanRepository, auditRepo *repository.AuditRepository) *PaymentHandler {
	return &PaymentHandler{payRepo: payRepo, loanRepo: loanRepo, auditRepo: auditRepo}
}

func (h *PaymentHandler) ListPayments(w http.ResponseWriter, r *http.Request) {
	loanID := r.URL.Query().Get("loanId")
	customerID := r.URL.Query().Get("customerId")

	var payments []models.Payment
	var err error

	if loanID != "" {
		payments, err = h.payRepo.GetByLoanID(loanID)
	} else if customerID != "" {
		payments, err = h.payRepo.GetByCustomerID(customerID)
	} else {
		payments, err = h.payRepo.GetAll()
	}

	if err != nil {
		sendJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	sendJSON(w, http.StatusOK, payments)
}

func (h *PaymentHandler) RecordPayment(w http.ResponseWriter, r *http.Request) {
	var p models.Payment
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		sendJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request payload"})
		return
	}

	if p.LoanID == "" || p.Amount <= 0 {
		sendJSON(w, http.StatusBadRequest, map[string]string{"error": "loanId and valid amount are required"})
		return
	}

	// Fetch loan to retrieve customer ID if missing
	loan, err := h.loanRepo.GetByID(p.LoanID)
	if err != nil || loan == nil {
		sendJSON(w, http.StatusBadRequest, map[string]string{"error": "Associated loan not found"})
		return
	}
	p.CustomerID = loan.CustomerID

	// Defaults
	if p.ID == "" {
		p.ID = "PAY-" + uuid.New().String()[:8]
	}
	p.ReceiptNo, err = h.payRepo.NextReceipt()
	if err != nil {
		fail(w, err)
		return
	}

	if p.Date == "" {
		p.Date = time.Now().Format("2006-01-02")
	}
	if p.Method == "" {
		p.Method = "Cash"
	}
	if p.Type == "" {
		p.Type = "Capital"
	}
	p.CollectedBy = r.Context().Value(middleware.UserContextKey).(*middleware.Claims).Name

	if err := h.payRepo.MutatePayment(&p, "create"); err != nil {
		sendJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to record payment: " + err.Error()})
		return
	}

	// Audit Log
	_ = h.auditRepo.Create(&models.AuditLog{
		ID:        "AUD-" + uuid.New().String()[:8],
		UserName:  p.CollectedBy,
		UserRole:  "Collection Agent",
		Action:    "PAYMENT_COLLECTED",
		Module:    "Repayments",
		Details:   fmt.Sprintf("Collected repayment of %.2f for Loan %s (Receipt: %s)", p.Amount, loan.LoanNo, p.ReceiptNo),
		IPAddress: r.RemoteAddr,
		Severity:  "INFO",
	})

	sendJSON(w, http.StatusCreated, p)
}

// ── ONLINE PAYMENTS HANDLERS ────────────────────────────────────────────────

func (h *PaymentHandler) ListOnlinePayments(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	list, err := h.payRepo.GetAllOnlinePayments(status, r.URL.Query().Get("loanId"), r.URL.Query().Get("customerId"))
	if err != nil {
		sendJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to list online payments: " + err.Error()})
		return
	}
	sendJSON(w, http.StatusOK, list)
}

func (h *PaymentHandler) SubmitOnlinePayment(w http.ResponseWriter, r *http.Request) {
	var op models.OnlinePayment
	if err := json.NewDecoder(r.Body).Decode(&op); err != nil {
		sendJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid payload"})
		return
	}

	if op.LoanID == "" || op.CustomerID == "" || op.Amount <= 0 {
		sendJSON(w, http.StatusBadRequest, map[string]string{"error": "loanId, customerId, and valid amount are required"})
		return
	}

	if op.ID == "" {
		op.ID = fmt.Sprintf("SLIP-%s", uuid.New().String()[:8])
	}
	op.Status = "PENDING"
	op.ReviewedBy = ""
	op.ReviewedAt = ""
	op.ReviewNotes = ""
	op.ReceiptNo = ""
	if op.PaymentMethod != "" && op.PaymentMethod != "BANK_SLIP" {
		fail(w, errors.New("card and QR processing are not configured; submit a bank transfer slip"))
		return
	}
	op.PaymentMethod = "BANK_SLIP"
	loan, err := h.loanRepo.GetByID(op.LoanID)
	if err != nil || loan == nil || loan.CustomerID != op.CustomerID {
		fail(w, errors.New("loan does not belong to this customer"))
		return
	}
	claims := r.Context().Value(middleware.UserContextKey).(*middleware.Claims)
	if claims.Role == "Customer" && claims.UserID != op.CustomerID {
		sendJSON(w, 403, map[string]string{"error": "This loan belongs to another customer"})
		return
	}
	if loan.Status != "Active" && loan.Status != "Overdue" {
		fail(w, errors.New("loan is not open for payment"))
		return
	}
	if strings.TrimSpace(op.SlipURL) == "" || strings.HasPrefix(op.SlipURL, "blob:") {
		fail(w, errors.New("upload a payment slip"))
		return
	}
	op.CustomerName = loan.CustomerName
	op.LoanNo = loan.LoanNo
	op.SubmittedAt = time.Now().Format(time.RFC3339)
	if op.PaymentDate == "" {
		op.PaymentDate = time.Now().Format("2006-01-02")
	}

	if err := h.payRepo.CreateOnlinePayment(&op); err != nil {
		sendJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to save online payment: " + err.Error()})
		return
	}

	// Audit Log
	_ = h.auditRepo.Create(&models.AuditLog{
		ID:        "AUD-" + uuid.New().String()[:8],
		UserName:  op.CustomerName,
		UserRole:  "Borrower",
		Action:    "ONLINE_SLIP_SUBMITTED",
		Module:    "Online Payments",
		Details:   fmt.Sprintf("Customer %s uploaded payment slip %s of %.2f for Loan %s", op.CustomerName, op.ID, op.Amount, op.LoanID),
		IPAddress: r.RemoteAddr,
		Severity:  "INFO",
	})

	sendJSON(w, http.StatusCreated, op)
}

func (h *PaymentHandler) ApproveOnlinePayment(w http.ResponseWriter, r *http.Request) {
	h.reviewOnlinePayment(w, r, true)
}
func (h *PaymentHandler) RejectOnlinePayment(w http.ResponseWriter, r *http.Request) {
	h.reviewOnlinePayment(w, r, false)
}
func (h *PaymentHandler) reviewOnlinePayment(w http.ResponseWriter, r *http.Request, approve bool) {
	var req struct {
		Notes string `json:"notes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		fail(w, err)
		return
	}
	claims := r.Context().Value(middleware.UserContextKey).(*middleware.Claims)
	id := chi.URLParam(r, "id")
	payment, err := h.payRepo.ReviewOnlinePayment(id, claims.Email, req.Notes, approve)
	if err != nil {
		fail(w, err)
		return
	}
	status := "REJECTED"
	if approve {
		status = "COMPLETED"
	}
	_ = h.auditRepo.Create(&models.AuditLog{ID: "AUD-" + uuid.NewString()[:8], UserName: claims.Email, UserRole: claims.Role, Action: "ONLINE_SLIP_" + status, Module: "Online Payments", Details: "Reviewed slip " + id, Severity: "INFO"})
	sendJSON(w, 200, map[string]interface{}{"success": true, "status": status, "payment": payment})
}
