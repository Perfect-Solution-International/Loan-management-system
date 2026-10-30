package middleware

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"loan-management-backend/config"
	"loan-management-backend/models"
)

type contextKey string

const UserContextKey = contextKey("user")

type Claims struct {
	OrganizationID string                  `json:"-"`
	Name           string                  `json:"name,omitempty"`
	Permissions    models.StaffPermissions `json:"-"`
	UserID         string                  `json:"userId"`
	Email          string                  `json:"email"`
	Role           string                  `json:"role"`
	jwt.RegisteredClaims
}

func GenerateToken(userID, email, role string, cfg *config.Config) (string, error) {
	claims := Claims{
		UserID: userID,
		Email:  email,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(cfg.JWTSecret))
}

func AuthMiddleware(cfg *config.Config) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, `{"error": "Authorization token required"}`, http.StatusUnauthorized)
				return
			}

			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
				http.Error(w, `{"error": "Invalid Authorization header format. Expected Bearer <token>"}`, http.StatusUnauthorized)
				return
			}

			tokenStr := parts[1]
			claims := &Claims{}

			token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
				return []byte(cfg.JWTSecret), nil
			}, jwt.WithValidMethods([]string{"HS256"}), jwt.WithExpirationRequired())

			if err != nil || !token.Valid {
				http.Error(w, `{"error": "Invalid or expired authorization token"}`, http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), UserContextKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func RequireRole(allowedRoles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, ok := r.Context().Value(UserContextKey).(*Claims)
			if !ok {
				http.Error(w, `{"error": "Unauthorized"}`, http.StatusUnauthorized)
				return
			}

			hasRole := false
			for _, role := range allowedRoles {
				if strings.EqualFold(claims.Role, role) {
					hasRole = true
					break
				}
			}

			if !hasRole {
				http.Error(w, `{"error": "Forbidden: insufficient permissions for this operation"}`, http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
