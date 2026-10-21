package handlers

import (
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"loan-management-backend/middleware"
	"loan-management-backend/models"
	"loan-management-backend/repository"
)

type LoanHandler struct {
	loanRepo  *repository.LoanRepository
	custRepo  *repository.CustomerRepository
	auditRepo *repository.AuditRepository
}

func NewLoanHandler(loanRepo *repository.LoanRepository, custRepo *repository.CustomerRepository, auditRepo *repository.AuditRepository) *LoanHandler {
	return &LoanHandler{loanRepo: loanRepo, custRepo: custRepo, auditRepo: auditRepo}
}

func (h *LoanHandler) ListLoans(w http.ResponseWriter, r *http.Request) {
	customerID := r.URL.Query().Get("customerId")
	var loans []models.Loan
	var err error

	if customerID != "" {
		loans, err = h.loanRepo.GetByCustomerID(customerID)
	} else {
		loans, err = h.loanRepo.GetAll()
	}

	if err != nil {
		sendJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	sendJSON(w, http.StatusOK, loans)
}

func (h *LoanHandler) GetLoan(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	loan, err := h.loanRepo.GetByID(id)
	if err != nil {
		sendJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if loan == nil {
		sendJSON(w, http.StatusNotFound, map[string]string{"error": "Loan not found"})
		return
	}
	sendJSON(w, http.StatusOK, loan)
}

func (h *LoanHandler) CreateLoan(w http.ResponseWriter, r *http.Request) {
	var l models.Loan
	if err := json.NewDecoder(r.Body).Decode(&l); err != nil {
		sendJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request payload"})
		return
	}

	if l.CustomerID == "" || l.Principal <= 0 {
		sendJSON(w, http.StatusBadRequest, map[string]string{"error": "customerId and valid principal amount are required"})
		return
	}

	// Verify customer exists
	cust, err := h.custRepo.GetByID(l.CustomerID)
	if err != nil || cust == nil {
		sendJSON(w, http.StatusBadRequest, map[string]string{"error": "Associated customer not found"})
		return
	}
	l.CustomerName = cust.Name

	// Defaults and auto-generations
	if l.ID == "" {
		l.ID = "LN-" + uuid.New().String()[:8]
	}
	if l.LoanNo == "" {
		l.LoanNo = fmt.Sprintf("LN-%d-%s", time.Now().Year(), l.ID[3:])
	}
	if l.Status == "" {
		l.Status = "Active"
	}
	if l.IssueDate == "" {
		l.IssueDate = time.Now().Format("2006-01-02")
	}
	if l.FirstPaymentDate == "" {
		l.FirstPaymentDate = time.Now().AddDate(0, 0, 1).Format("2006-01-02")
	}

	// Financial calculation fallbacks
	if l.RatePeriod == "" {
		l.RatePeriod = "Monthly"
	}
	if l.RepaymentFrequency == "" {
		l.RepaymentFrequency = "Daily"
	}
	if l.Duration <= 0 {
		l.Duration = 30
	}
	if l.TotalRepayment <= 0 {
		periods := float64(l.Duration)
		if l.RatePeriod == "Monthly" {
			if l.RepaymentFrequency == "Weekly" {
				periods = float64(l.Duration) / 4.0
			} else if l.RepaymentFrequency == "Daily" {
				periods = float64(l.Duration) / 30.0
			}
		} else if l.RatePeriod == "Weekly" {
			if l.RepaymentFrequency == "Monthly" {
				periods = float64(l.Duration) * 4.0
			} else if l.RepaymentFrequency == "Daily" {
				periods = float64(l.Duration) / 7.0
			}
		} else if l.RatePeriod == "Daily" {
			if l.RepaymentFrequency == "Weekly" {
				periods = float64(l.Duration) * 7.0
			} else if l.RepaymentFrequency == "Monthly" {
				periods = float64(l.Duration) * 30.0
			}
		} else if l.RatePeriod == "Flat" {
			periods = 1.0
		}
		totalInterest := math.Round(l.Principal*(l.InterestRate/100.0)*periods*100) / 100
		remCap := math.Max(0, l.Principal-l.CapitalDeduction)
		remInt := math.Max(0, totalInterest-l.InterestDeduction)
		l.Interest = totalInterest
		l.TotalRepayment = math.Round((remCap+remInt)*100) / 100
		l.NetDisbursement = math.Max(0, math.Round((l.Principal-(l.CapitalDeduction+l.InterestDeduction+l.OtherFees))*100)/100)
		if l.Duration > 0 {
			if l.RepaymentType == "Interest Only" {
				l.Installment = math.Round((remInt/float64(l.Duration))*100) / 100
			} else {
				l.Installment = math.Round((l.TotalRepayment/float64(l.Duration))*100) / 100
			}
		}
	}

	if err := h.loanRepo.Create(&l); err != nil {
		sendJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to create loan: " + err.Error()})
		return
	}

	// Audit Log
	userStr := "Staff"
	if claims, ok := r.Context().Value(middleware.UserContextKey).(*middleware.Claims); ok {
		userStr = claims.Email
	}
	_ = h.auditRepo.Create(&models.AuditLog{
		ID:        "AUD-" + uuid.New().String()[:8],
		UserName:  userStr,
		UserRole:  "Staff",
		Action:    "LOAN_APPLICATION_CREATED",
		Module:    "Loans",
		Details:   fmt.Sprintf("Disbursed loan %s for customer %s (Amount: %.2f)", l.LoanNo, l.CustomerName, l.Principal),
		IPAddress: r.RemoteAddr,
		Severity:  "INFO",
	})

	sendJSON(w, http.StatusCreated, l)
}

type UpdateStatusRequest struct {
	Status string `json:"status"` // Active, Completed, Rejected
}

func (h *LoanHandler) UpdateLoanStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req UpdateStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid payload"})
		return
	}

	approver := "Authorized Officer"
	if claims, ok := r.Context().Value(middleware.UserContextKey).(*middleware.Claims); ok {
		approver = claims.Email
	}

	if err := h.loanRepo.UpdateStatus(id, req.Status, approver); err != nil {
		sendJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	sendJSON(w, http.StatusOK, map[string]string{
		"message": "Loan status updated to " + req.Status,
		"id":      id,
	})
}

