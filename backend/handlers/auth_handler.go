package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"loan-management-backend/config"
	"loan-management-backend/middleware"
	"loan-management-backend/models"
	"loan-management-backend/repository"
)

type AuthHandler struct {
	userRepo  *repository.UserRepository
	auditRepo *repository.AuditRepository
	cfg       *config.Config
}

func NewAuthHandler(userRepo *repository.UserRepository, auditRepo *repository.AuditRepository, cfg *config.Config) *AuthHandler {
	return &AuthHandler{
		userRepo:  userRepo,
		auditRepo: auditRepo,
		cfg:       cfg,
	}
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token string      `json:"token"`
	User  models.User `json:"user"`
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid request payload"})
		return
	}

	user, err := h.userRepo.FindByEmail(req.Email)
	if err != nil {
		sendJSON(w, http.StatusInternalServerError, map[string]string{"error": "Database lookup failed"})
		return
	}

	if user == nil {
		sendJSON(w, http.StatusUnauthorized, map[string]string{"error": "Invalid email or password"})
		return
	}

	// Compare bcrypt password hash (or fallback to plaintext check for quick demo/testing if not yet hashed)
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password))
	if err != nil && user.PasswordHash != req.Password {
		sendJSON(w, http.StatusUnauthorized, map[string]string{"error": "Invalid email or password"})
		return
	}

	token, err := middleware.GenerateToken(user.ID, user.Email, user.Role, h.cfg)
	if err != nil {
		sendJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to generate authorization token"})
		return
	}

	// Audit Log
	_ = h.auditRepo.Create(&models.AuditLog{
		ID:        "AUD-" + uuid.New().String()[:8],
		UserName:  user.Name,
		UserRole:  user.Role,
		Action:    "STAFF_LOGIN",
		Module:    "Auth",
		Details:   "User logged in from " + r.RemoteAddr,
		IPAddress: r.RemoteAddr,
		Severity:  "INFO",
	})

	sendJSON(w, http.StatusOK, LoginResponse{
		Token: token,
		User:  *user,
	})
}

func (h *AuthHandler) GetMe(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(middleware.UserContextKey).(*middleware.Claims)
	if !ok {
		sendJSON(w, http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
		return
	}

	user, err := h.userRepo.FindByID(claims.UserID)
	if err != nil || user == nil {
		sendJSON(w, http.StatusNotFound, map[string]string{"error": "User record not found"})
		return
	}

	sendJSON(w, http.StatusOK, user)
}

func (h *AuthHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	users, err := h.userRepo.GetAll()
	if err != nil {
		sendJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	sendJSON(w, http.StatusOK, users)
}

func sendJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

