package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"loan-management-backend/config"
	"loan-management-backend/middleware"
	"loan-management-backend/models"
	"loan-management-backend/repository"
	"net/http"
	"strings"
	"time"
)

func fail(w http.ResponseWriter, err error) {
	status := http.StatusBadRequest
	if errors.Is(err, sql.ErrNoRows) {
		status = http.StatusNotFound
	}
	if errors.Is(err, repository.ErrConflict) {
		status = http.StatusConflict
	}
	sendJSON(w, status, map[string]string{"error": err.Error()})
}

func (h *LoanHandler) GetNotes(w http.ResponseWriter, r *http.Request) {
	notes, err := h.loanRepo.GetNotes()
	if err != nil {
		fail(w, err)
		return
	}
	sendJSON(w, 200, notes)
}

func (h *LoanHandler) SaveNote(w http.ResponseWriter, r *http.Request) {
	var note repository.LoanNote
	if err := json.NewDecoder(r.Body).Decode(&note); err != nil {
		fail(w, err)
		return
	}
	if _, err := time.Parse("2006-01-02", note.PromiseDate); err != nil {
		fail(w, errors.New("a valid promise date is required"))
		return
	}
	if err := h.loanRepo.SaveNote(chi.URLParam(r, "id"), &note); err != nil {
		fail(w, err)
		return
	}
	sendJSON(w, 200, note)
}

func (h *LoanHandler) DeleteLoan(w http.ResponseWriter, r *http.Request) {
	if err := h.loanRepo.DeleteApplication(chi.URLParam(r, "id")); err != nil {
		fail(w, err)
		return
	}
	sendJSON(w, 200, map[string]bool{"success": true})
}

// Recheck active status and current permissions on every request, including old JWTs.
func (h *AuthHandler) RequireStaff(permission string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, _ := r.Context().Value(middleware.UserContextKey).(*middleware.Claims)
			if claims == nil || claims.Role == "Customer" {
				sendJSON(w, 403, map[string]string{"error": "Staff access required"})
				return
			}
			user, err := h.userRepo.FindByID(claims.UserID)
			if err != nil || user == nil || user.Status != "Active" || (user.Role != "Admin" && user.Role != "Staff") {
				sendJSON(w, 401, map[string]string{"error": "Staff account unavailable"})
				return
			}
			allowed := permission == "" || user.Role == "Admin"
			switch permission {
			case "manageCustomers":
				allowed = allowed || user.Permissions.ManageCustomers
			case "approveLoans":
				allowed = allowed || user.Permissions.ApproveLoans
			case "recordRepayments":
				allowed = allowed || user.Permissions.RecordRepayments
			case "manageSettings":
				allowed = allowed || user.Permissions.ManageSettings
			}
			if !allowed {
				sendJSON(w, 403, map[string]string{"error": "You do not have permission for this operation"})
				return
			}
			current := *claims
			current.Role = user.Role
			current.Email = user.Email
			current.Name = user.Name
			current.Permissions = user.Permissions
			next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), middleware.UserContextKey, &current)))
		})
	}
}

func (h *AuthHandler) SaveUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	u := &models.User{}
	if id != "" {
		var err error
		u, err = h.userRepo.FindByID(id)
		if err != nil {
			fail(w, err)
			return
		}
		if u == nil {
			fail(w, sql.ErrNoRows)
			return
		}
	}
	// Never echo or retain plaintext credentials.
	if err := json.NewDecoder(r.Body).Decode(u); err != nil {
		fail(w, err)
		return
	}
	if id != "" {
		u.ID = id
	} else if u.ID == "" {
		u.ID = "STF-" + uuid.NewString()[:8]
	}
	if u.Name == "" || u.Email == "" || (id == "" && len(u.Password) < 6) {
		fail(w, errors.New("name, email and a password of at least 6 characters are required"))
		return
	}
	switch u.Role {
	case "Admin", "Staff":
	default:
		fail(w, errors.New("invalid staff role"))
		return
	}
	if u.Status == "" {
		u.Status = "Active"
	}
	if u.Status != "Active" && u.Status != "Inactive" {
		fail(w, errors.New("invalid staff status"))
		return
	}
	claims := r.Context().Value(middleware.UserContextKey).(*middleware.Claims)
	if id == claims.UserID && (u.Role != "Admin" || u.Status != "Active") {
		fail(w, errors.New("you cannot deactivate or demote your own administrator account"))
		return
	}
	if u.JoinedDate == "" {
		u.JoinedDate = time.Now().Format("2006-01-02")
	}
	u.PasswordHash = ""
	if u.Password != "" {
		if len(u.Password) < 6 {
			fail(w, errors.New("password must contain at least 6 characters"))
			return
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(u.Password), bcrypt.DefaultCost)
		if err != nil {
			fail(w, err)
			return
		}
		u.PasswordHash = string(hash)
	}
	u.Password = ""
	var err error
	if id == "" {
		err = h.userRepo.Create(u)
	} else {
		err = h.userRepo.Update(u)
	}
	if err != nil {
		fail(w, err)
		return
	}
	sendJSON(w, http.StatusOK, u)
}

type PortalHandler struct {
	users     *repository.UserRepository
	customers *repository.CustomerRepository
	loans     *repository.LoanRepository
	payments  *repository.PaymentRepository
	settings  *repository.SettingsRepository
	cfg       *config.Config
}

func NewPortalHandler(c *repository.CustomerRepository, l *repository.LoanRepository, p *repository.PaymentRepository, s *repository.SettingsRepository, cfg *config.Config, users *repository.UserRepository) *PortalHandler {
	return &PortalHandler{users, c, l, p, s, cfg}
}

func (h *PortalHandler) accountEnabled(id string) bool {
	user, err := h.users.FindByID(id)
	return err == nil && (user == nil || (user.Role == "Customer" && user.Status == "Active"))
}

func (h *PortalHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Identifier string `json:"identifier"`
		Password   string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		fail(w, err)
		return
	}
	id, hash, err := h.customers.Credentials(strings.TrimSpace(req.Identifier))
	if err != nil || bcrypt.CompareHashAndPassword([]byte(hash), []byte(req.Password)) != nil {
		sendJSON(w, 401, map[string]string{"error": "Invalid customer credentials"})
		return
	}
	c, err := h.customers.GetByID(id)
	if err != nil || c == nil || !strings.EqualFold(c.Status, "Active") || !h.accountEnabled(c.ID) {
		sendJSON(w, 401, map[string]string{"error": "Customer account unavailable"})
		return
	}
	token, err := middleware.GenerateToken(c.ID, c.Email, "Customer", h.cfg)
	if err != nil {
		fail(w, err)
		return
	}
	sendJSON(w, 200, map[string]interface{}{"token": token, "customer": c})
}

func (h *PortalHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req struct{ Name, Username, Email, Password string }
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		fail(w, err)
		return
	}
	if len(strings.TrimSpace(req.Name)) < 2 || len(req.Username) < 3 || !strings.Contains(req.Email, "@") || len(req.Password) < 6 {
		fail(w, errors.New("name, username, email and a password of at least 6 characters are required"))
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		fail(w, err)
		return
	}
	c := models.Customer{ID: "CUS-" + uuid.NewString()[:8], Name: strings.TrimSpace(req.Name), FullName: strings.TrimSpace(req.Name), Username: strings.ToLower(strings.TrimSpace(req.Username)), Email: strings.TrimSpace(req.Email), Status: "Active", RegisteredAt: time.Now().Format("2006-01-02"), PasswordHash: string(hash)}
	// Unverified self-registration gets a unique placeholder until staff records the NIC.
	c.NIC = "UNVERIFIED-" + c.ID
	if err = h.customers.Create(&c); err != nil {
		fail(w, err)
		return
	}
	sendJSON(w, 201, c)
}

func (h *PortalHandler) Snapshot(w http.ResponseWriter, r *http.Request) {
	claims := r.Context().Value(middleware.UserContextKey).(*middleware.Claims)
	c, err := h.customers.GetByID(claims.UserID)
	if err != nil {
		fail(w, err)
		return
	}
	if c == nil || !strings.EqualFold(c.Status, "Active") || !h.accountEnabled(c.ID) {
		sendJSON(w, 401, map[string]string{"error": "Customer account unavailable"})
		return
	}
	loans, err := h.loans.GetByCustomerID(c.ID)
	if err != nil {
		fail(w, err)
		return
	}
	payments, err := h.payments.GetByCustomerID(c.ID)
	if err != nil {
		fail(w, err)
		return
	}
	online, err := h.payments.GetOnlinePaymentsForCustomer(c.ID)
	if err != nil {
		fail(w, err)
		return
	}
	settings, err := h.settings.Get()
	if err != nil {
		fail(w, err)
		return
	}
	sendJSON(w, 200, map[string]interface{}{"customer": c, "loans": loans, "payments": payments, "onlinePayments": online, "settings": settings})
}

func (h *CustomerHandler) AddDocument(w http.ResponseWriter, r *http.Request) {
	var doc models.CustomerDocument
	if err := json.NewDecoder(r.Body).Decode(&doc); err != nil {
		fail(w, err)
		return
	}
	doc.CustomerID = chi.URLParam(r, "id")
	if doc.ID == "" {
		doc.ID = "DOC-" + uuid.NewString()[:8]
	}
	if doc.Title == "" || doc.FileURL == "" || strings.HasPrefix(doc.FileURL, "blob:") {
		fail(w, errors.New("a title and persistent file contents are required"))
		return
	}
	if doc.UploadedAt == "" {
		doc.UploadedAt = time.Now().Format("2006-01-02")
	}
	if err := h.custRepo.AddDocument(doc.CustomerID, doc); err != nil {
		fail(w, err)
		return
	}
	sendJSON(w, 201, doc)
}

func (h *CustomerHandler) DeleteDocument(w http.ResponseWriter, r *http.Request) {
	if err := h.custRepo.DeleteDocument(chi.URLParam(r, "id"), chi.URLParam(r, "documentID")); err != nil {
		fail(w, err)
		return
	}
	sendJSON(w, 200, map[string]bool{"success": true})
}

func (h *PaymentHandler) UpdatePayment(w http.ResponseWriter, r *http.Request) {
	p, err := h.payRepo.GetByID(chi.URLParam(r, "id"))
	if err != nil {
		fail(w, err)
		return
	}
	original := *p
	if err = json.NewDecoder(r.Body).Decode(p); err != nil {
		fail(w, err)
		return
	}
	p.ID = original.ID
	p.LoanID = original.LoanID
	p.CustomerID = original.CustomerID
	p.ReceiptNo = original.ReceiptNo
	if p.Amount <= 0 {
		fail(w, errors.New("amount must be positive"))
		return
	}
	if err = h.payRepo.MutatePayment(p, "update"); err != nil {
		fail(w, err)
		return
	}
	sendJSON(w, 200, p)
}

func (h *PaymentHandler) DeletePayment(w http.ResponseWriter, r *http.Request) {
	p, err := h.payRepo.GetByID(chi.URLParam(r, "id"))
	if err != nil {
		fail(w, err)
		return
	}
	if err = h.payRepo.MutatePayment(p, "delete"); err != nil {
		fail(w, err)
		return
	}
	sendJSON(w, 200, map[string]bool{"success": true})
}

func (h *PortalHandler) RequireCustomer(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := r.Context().Value(middleware.UserContextKey).(*middleware.Claims)
		c, err := h.customers.GetByID(claims.UserID)
		if err != nil || c == nil || !strings.EqualFold(c.Status, "Active") || !h.accountEnabled(c.ID) {
			sendJSON(w, 401, map[string]string{"error": "Customer account unavailable"})
			return
		}
		next.ServeHTTP(w, r)
	})
}
