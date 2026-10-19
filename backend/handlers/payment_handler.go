package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

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
	if p.CustomerID == "" {
		p.CustomerID = loan.CustomerID
	}

	// Defaults
	if p.ID == "" {
		p.ID = "PAY-" + uuid.New().String()[:8]
	}
	if p.ReceiptNo == "" {
		count, _ := h.paymentRepo.GetCount()
		p.ReceiptNo = fmt.Sprintf("REC-%d-%04d", time.Now().Year(), count+1)
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
	if p.CollectedBy == "" {
		p.CollectedBy = "Field Officer"
		if claims, ok := r.Context().Value(middleware.UserContextKey).(*middleware.Claims); ok {
			p.CollectedBy = claims.Email
		}
	}

	if err := h.payRepo.Create(&p); err != nil {
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

