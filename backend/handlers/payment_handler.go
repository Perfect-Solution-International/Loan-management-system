package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
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
	if p.CustomerID == "" {
		p.CustomerID = loan.CustomerID
	}

	// Defaults
	if p.ID == "" {
		p.ID = "PAY-" + uuid.New().String()[:8]
	}
	if p.ReceiptNo == "" {
		count, _ := h.payRepo.GetCount()
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

	// Check if loan is now fully settled and mark Completed
	allPayments, _ := h.payRepo.GetByLoanID(p.LoanID)
	totalPaid := 0.0
	for _, pay := range allPayments {
		totalPaid += pay.Amount
	}
	expectedRepay := loan.TotalRepayment
	if expectedRepay <= 0 {
		expectedRepay = loan.Principal + loan.Interest
	}
	if expectedRepay > 0 && totalPaid >= expectedRepay && loan.Status != "Completed" {
		_ = h.loanRepo.UpdateStatus(loan.ID, "Completed", "System Auto-Settlement")
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
	list, err := h.payRepo.GetAllOnlinePayments(status)
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
	if op.Status == "" {
		op.Status = "PENDING"
	}
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
	id := chi.URLParam(r, "id")
	if id == "" {
		sendJSON(w, http.StatusBadRequest, map[string]string{"error": "Slip ID is required"})
		return
	}

	var req struct {
		Notes     string `json:"notes"`
		Reviewer  string `json:"reviewer"`
		ReceiptNo string `json:"receiptNo"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)

	if req.Reviewer == "" {
		req.Reviewer = "Admin Officer"
	}
	if req.ReceiptNo == "" {
		count, _ := h.payRepo.GetCount()
		req.ReceiptNo = fmt.Sprintf("REC-%d-%04d", time.Now().Year(), count+1)
	}

	// 1. Fetch online payment record
	op, err := h.payRepo.GetOnlinePaymentByID(id)
	if err != nil || op == nil {
		sendJSON(w, http.StatusNotFound, map[string]string{"error": "Online payment slip not found"})
		return
	}

	// 2. Update status
	if err := h.payRepo.UpdateOnlinePaymentStatus(id, "COMPLETED", req.Reviewer, req.Notes, req.ReceiptNo); err != nil {
		sendJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to update slip status: " + err.Error()})
		return
	}

	// 3. Create regular payment record in ledger
	p := &models.Payment{
		ID:          "PAY-" + uuid.New().String()[:8],
		LoanID:      op.LoanID,
		CustomerID:  op.CustomerID,
		Amount:      op.Amount,
		Date:        op.PaymentDate,
		Type:        "Capital",
		Method:      "Bank Transfer",
		Notes:       fmt.Sprintf("[Online Slip Approved] Ref: %s | Bank: %s | Notes: %s", op.ReferenceNumber, op.BankName, req.Notes),
		CollectedBy: req.Reviewer,
		ReceiptNo:   req.ReceiptNo,
	}
	_ = h.payRepo.Create(p)

	// Check if loan is now fully settled and mark Completed
	loan, _ := h.loanRepo.GetByID(op.LoanID)
	if loan != nil {
		allPayments, _ := h.payRepo.GetByLoanID(op.LoanID)
		totalPaid := 0.0
		for _, pay := range allPayments {
			totalPaid += pay.Amount
		}
		expectedRepay := loan.TotalRepayment
		if expectedRepay <= 0 {
			expectedRepay = loan.Principal + loan.Interest
		}
		if expectedRepay > 0 && totalPaid >= expectedRepay && loan.Status != "Completed" {
			_ = h.loanRepo.UpdateStatus(loan.ID, "Completed", "System Auto-Settlement")
		}
	}

	// Audit Log
	_ = h.auditRepo.Create(&models.AuditLog{
		ID:        "AUD-" + uuid.New().String()[:8],
		UserName:  req.Reviewer,
		UserRole:  "Administrator",
		Action:    "ONLINE_SLIP_APPROVED",
		Module:    "Online Payments",
		Details:   fmt.Sprintf("Approved slip %s (Amount: %.2f, Receipt: %s)", id, op.Amount, req.ReceiptNo),
		IPAddress: r.RemoteAddr,
		Severity:  "INFO",
	})

	sendJSON(w, http.StatusOK, map[string]interface{}{
		"success":   true,
		"status":    "COMPLETED",
		"receiptNo": req.ReceiptNo,
		"payment":   p,
	})
}

func (h *PaymentHandler) RejectOnlinePayment(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		sendJSON(w, http.StatusBadRequest, map[string]string{"error": "Slip ID is required"})
		return
	}

	var req struct {
		Notes    string `json:"notes"`
		Reviewer string `json:"reviewer"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)

	if req.Reviewer == "" {
		req.Reviewer = "Admin Officer"
	}
	if req.Notes == "" {
		req.Notes = "Payment slip declined by administrator"
	}

	if err := h.payRepo.UpdateOnlinePaymentStatus(id, "REJECTED", req.Reviewer, req.Notes, ""); err != nil {
		sendJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to decline slip: " + err.Error()})
		return
	}

	// Audit Log
	_ = h.auditRepo.Create(&models.AuditLog{
		ID:        "AUD-" + uuid.New().String()[:8],
		UserName:  req.Reviewer,
		UserRole:  "Administrator",
		Action:    "ONLINE_SLIP_DECLINED",
		Module:    "Online Payments",
		Details:   fmt.Sprintf("Declined slip %s. Reason: %s", id, req.Notes),
		IPAddress: r.RemoteAddr,
		Severity:  "WARNING",
	})

	sendJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"status":  "REJECTED",
	})
}


