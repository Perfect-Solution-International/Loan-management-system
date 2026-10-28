package handlers

import (
	"encoding/json"
	"errors"
	"golang.org/x/crypto/bcrypt"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"loan-management-backend/middleware"
	"loan-management-backend/models"
	"loan-management-backend/repository"
)

type CustomerHandler struct {
	custRepo  *repository.CustomerRepository
	auditRepo *repository.AuditRepository
}

func NewCustomerHandler(custRepo *repository.CustomerRepository, auditRepo *repository.AuditRepository) *CustomerHandler {
	return &CustomerHandler{custRepo: custRepo, auditRepo: auditRepo}
}

func (h *CustomerHandler) ListCustomers(w http.ResponseWriter, r *http.Request) {
	customers, err := h.custRepo.GetAll()
	if err != nil {
		sendJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	sendJSON(w, http.StatusOK, customers)
}

func (h *CustomerHandler) GetCustomer(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	customer, err := h.custRepo.GetByID(id)
	if err != nil {
		sendJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if customer == nil {
		sendJSON(w, http.StatusNotFound, map[string]string{"error": "Customer not found"})
		return
	}
	sendJSON(w, http.StatusOK, customer)
}

// Lookup allows borrower verification by NIC or Phone
func (h *CustomerHandler) LookupCustomer(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("query"))
	if query == "" {
		sendJSON(w, http.StatusBadRequest, map[string]string{"error": "Query parameter is required (NIC or Phone)"})
		return
	}

	customer, err := h.custRepo.GetByNIC(query)
	if err != nil {
		sendJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if customer == nil {
		// Lookup by ID, phone, email or username.
		id, _, lookupErr := h.custRepo.Credentials(query)
		if lookupErr == nil {
			customer, _ = h.custRepo.GetByID(id)
		}
	}

	if customer == nil {
		sendJSON(w, http.StatusNotFound, map[string]string{"error": "No borrower account found for this NIC/Phone"})
		return
	}

	sendJSON(w, http.StatusOK, customer)
}

func (h *CustomerHandler) CreateCustomer(w http.ResponseWriter, r *http.Request) {
	var c models.Customer
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		sendJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request payload"})
		return
	}

	if c.Name == "" || c.NIC == "" || c.Phone == "" {
		sendJSON(w, http.StatusBadRequest, map[string]string{"error": "Name, NIC, and Phone are required fields"})
		return
	}

	// Generate ID if missing
	if c.ID == "" {
		c.ID = "CUST-" + uuid.New().String()[:8]
	}
	if c.Status == "" {
		c.Status = "Active"
	}
	if c.RegisteredAt == "" {
		c.RegisteredAt = time.Now().Format("2006-01-02")
	}

	if c.Password != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(c.Password), bcrypt.DefaultCost)
		if err != nil {
			fail(w, err)
			return
		}
		c.PasswordHash = string(hash)
	}
	c.Password = ""
	if len(c.RegisteredAt) > 10 {
		c.RegisteredAt = c.RegisteredAt[:10]
	}
	if err := h.custRepo.Create(&c); err != nil {
		sendJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to create customer: " + err.Error()})
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
		Action:    "CUSTOMER_REGISTERED",
		Module:    "Customers",
		Details:   "Registered new customer " + c.Name + " (" + c.NIC + ")",
		IPAddress: r.RemoteAddr,
		Severity:  "INFO",
	})

	sendJSON(w, http.StatusCreated, c)
}

func (h *CustomerHandler) UpdateCustomer(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	existing, err := h.custRepo.GetByID(id)
	if err != nil {
		fail(w, err)
		return
	}
	if existing == nil {
		sendJSON(w, 404, map[string]string{"error": "Customer not found"})
		return
	}
	c := *existing
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		sendJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request payload"})
		return
	}

	c.ID = id
	if c.Name == "" || c.NIC == "" {
		fail(w, errors.New("name and NIC are required"))
		return
	}
	if c.Password != "" {
		if len(c.Password) < 6 {
			fail(w, errors.New("password must contain at least 6 characters"))
			return
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(c.Password), bcrypt.DefaultCost)
		if err != nil {
			fail(w, err)
			return
		}
		c.PasswordHash = string(hash)
	}
	c.Password = ""
	if err := h.custRepo.Update(&c); err != nil {
		sendJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to update customer: " + err.Error()})
		return
	}

	sendJSON(w, http.StatusOK, c)
}

func (h *CustomerHandler) DeleteCustomer(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.custRepo.Delete(id); err != nil {
		sendJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to delete customer: " + err.Error()})
		return
	}
	sendJSON(w, http.StatusOK, map[string]string{"message": "Customer deleted successfully"})
}
