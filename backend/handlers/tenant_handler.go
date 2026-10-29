package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"github.com/go-chi/chi/v5"
	"io"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"loan-management-backend/database"
	"loan-management-backend/middleware"
)

// Restrict costly public authentication/registration calls by socket IP. Forwarded
// headers are deliberately ignored here unless a trusted proxy is configured.
func PublicRateLimit() func(http.Handler) http.Handler {
	type bucket struct {
		count int
		until time.Time
	}
	var mu sync.Mutex
	items := map[string]bucket{}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			host, _, err := net.SplitHostPort(r.RemoteAddr)
			if err != nil {
				host = r.RemoteAddr
			}
			now := time.Now()
			mu.Lock()
			b, exists := items[host]
			if !exists && len(items) >= 10000 {
				for k, v := range items {
					if !now.Before(v.until) {
						delete(items, k)
					}
				}
				if len(items) >= 10000 {
					mu.Unlock()
					w.Header().Set("Retry-After", "600")
					sendJSON(w, 429, map[string]string{"error": "Too many attempts. Please try again later."})
					return
				}
			}
			if !now.Before(b.until) {
				b = bucket{until: now.Add(10 * time.Minute)}
			}
			b.count++
			items[host] = b
			mu.Unlock()
			if b.count > 40 {
				w.Header().Set("Retry-After", "600")
				sendJSON(w, 429, map[string]string{"error": "Too many attempts. Please try again later."})
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// Public tenant selection only chooses which credential database to check. It
// grants no access: the existing password verification still runs inside RLS.
func (h *BillingHandler) PublicLegacy(legacy func(*database.DB) http.Handler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 64*1024))
		if err != nil {
			sendJSON(w, 400, map[string]string{"error": "Invalid request"})
			return
		}
		r.Body = io.NopCloser(bytes.NewReader(body))
		var in struct {
			Email          string `json:"email"`
			Identifier     string `json:"identifier"`
			OrganizationID string `json:"organizationId"`
		}
		if json.Unmarshal(body, &in) != nil {
			sendJSON(w, 400, map[string]string{"error": "Invalid request"})
			return
		}
		org := in.OrganizationID
		if strings.HasSuffix(r.URL.Path, "/register") {
			if org == "" {
				org = database.LegacyOrganization
			}
			if _, err = uuid.Parse(org); err != nil {
				sendJSON(w, 400, map[string]string{"error": "Invalid organization"})
				return
			}
			s, e := h.repo.Snapshot(org)
			if e != nil || !s.CanCreate {
				sendJSON(w, 402, map[string]string{"error": "This organization is not accepting new accounts. Contact its administrator."})
				return
			}
		} else {
			query := `SELECT DISTINCT organization_id FROM users WHERE (LOWER(email)=LOWER($1) OR (LOWER(id)=LOWER($1) AND NOT EXISTS(SELECT 1 FROM users WHERE LOWER(email)=LOWER($1)))) AND ($2='' OR organization_id::text=$2)`
			value := strings.TrimSpace(in.Email)
			if strings.Contains(r.URL.Path, "/portal/") {
				query = `SELECT DISTINCT organization_id FROM customers WHERE (LOWER(id)=LOWER($1) OR LOWER(nic)=LOWER($1) OR LOWER(email)=LOWER($1) OR LOWER(username)=LOWER($1) OR phone=$1) AND ($2='' OR organization_id::text=$2)`
				value = strings.TrimSpace(in.Identifier)
			}
			rows, e := h.db.Query(query, value, org)
			if e != nil {
				sendJSON(w, 503, map[string]string{"error": "Account lookup unavailable. Check that migrations have been applied."})
				return
			}
			ids := []string{}
			for rows.Next() {
				var id string
				if e = rows.Scan(&id); e != nil {
					break
				}
				ids = append(ids, id)
			}
			rowErr := rows.Err()
			rows.Close()
			if e != nil || rowErr != nil || len(ids) != 1 {
				sendJSON(w, 401, map[string]string{"error": "Invalid credentials or organization. Use the organization ID when your identifier belongs to multiple lenders."})
				return
			}
			org = ids[0]
		}
		h.serveTenant(w, r, org, legacy)
	}
}
func (h *BillingHandler) serveTenant(w http.ResponseWriter, r *http.Request, org string, legacy func(*database.DB) http.Handler) {
	scoped, release, err := h.db.Tenant(r.Context(), org)
	if err != nil {
		sendJSON(w, 503, map[string]string{"error": "Tenant database is unavailable. Verify the SaaS migration and database role grants."})
		return
	}
	defer release()
	// A fresh route context keeps the existing router's parameter handling intact.
	legacy(scoped).ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, chi.NewRouteContext())))
}

func (h *BillingHandler) TenantLegacy(legacy func(*database.DB) http.Handler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		c := orgClaims(r)
		// Read/export and essential financial recordkeeping are always available with
		// normal permissions, including borrower slips, repayment corrections and notes.
		path := r.URL.Path
		protected := r.Method == "POST" && (path == "/api/loans" || path == "/api/customers" || path == "/api/users")
		protected = protected || (r.Method == "PATCH" && strings.HasPrefix(path, "/api/loans/") && strings.HasSuffix(path, "/status"))
		if protected && c.Role == "Customer" {
			sendJSON(w, 403, map[string]string{"error": "Staff access required"})
			return
		}
		if protected && c.Role != "Admin" {
			allowed := false
			if r.Method == "POST" && (path == "/api/loans" || path == "/api/customers") {
				allowed = c.Permissions.ManageCustomers
			}
			if r.Method == "PATCH" {
				allowed = c.Permissions.ApproveLoans
			}
			if !allowed {
				sendJSON(w, 403, map[string]string{"error": "You do not have permission for this operation"})
				return
			}
		}
		if r.Method == "PATCH" && protected {
			body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 64*1024))
			if err != nil {
				sendJSON(w, 400, map[string]string{"error": "Invalid request"})
				return
			}
			r.Body = io.NopCloser(bytes.NewReader(body))
			var in struct {
				Status string `json:"status"`
			}
			if json.Unmarshal(body, &in) == nil && in.Status == "Rejected" {
				protected = false
			}
		}
		if protected {
			s, err := h.repo.Snapshot(c.OrganizationID)
			if err != nil {
				billingFail(w, err)
				return
			}
			if !s.CanCreate {
				sendJSON(w, 402, map[string]string{"error": "Your organization's subscription requires renewal. Existing records and repayment recording remain available.", "code": "subscription_required", "billingUrl": "/dashboard/billing"})
				return
			}
		}
		h.serveTenant(w, r, c.OrganizationID, legacy)
	}
}

// Request-local router construction keeps all existing handlers/repositories on
// the same isolated connection. No shared repository has mutable tenant state.
func (h *BillingHandler) AuthenticatedLegacy(legacy func(*database.DB) http.Handler) http.Handler {
	return middleware.AuthMiddleware(h.cfg)(h.Organization(h.TenantLegacy(legacy)))
}
