package main

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
	"loan-management-backend/config"
	"loan-management-backend/database"
	"loan-management-backend/handlers"
	"loan-management-backend/middleware"
)

func newRouter(db *database.DB, cfg *config.Config) http.Handler {
	if db == nil {
		return legacyRouter(nil, cfg)
	}
	billing := handlers.NewBillingHandler(db, cfg)
	legacy := func(scoped *database.DB) http.Handler { return legacyRouter(scoped, cfg) }
	r := chi.NewRouter()
	r.Use(cors.Handler(cors.Options{AllowedOrigins: cfg.AllowedOrigins, AllowedMethods: []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}, AllowedHeaders: []string{"Accept", "Authorization", "Content-Type", "X-Billing-Signature", "X-Billing-Timestamp"}, MaxAge: 300}))
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			w.Header().Set("Cache-Control", "no-store")
			next.ServeHTTP(w, req)
		})
	})
	r.Get("/health", legacyRouter(db, cfg).ServeHTTP)
	r.Get("/api/billing/plans", billing.Plans)
	limit := handlers.PublicRateLimit()
	r.With(limit).Post("/api/organizations/register", billing.Register)
	r.With(limit).Post("/api/platform/login", billing.PlatformLogin)
	for _, path := range []string{"/api/auth/login", "/api/portal/login", "/api/portal/register"} {
		r.With(limit).Post(path, billing.PublicLegacy(legacy))
	}
	r.Post("/api/billing/webhooks/{provider}", billing.Webhook)
	r.Group(func(admin chi.Router) {
		admin.Use(middleware.AuthMiddleware(cfg), billing.Organization, billing.RequireOrganizationAdmin)
		admin.Get("/api/billing/subscription", billing.Subscription)
		admin.Get("/api/billing/contact", billing.BillingContact)
		admin.Put("/api/billing/contact", billing.SaveBillingContact)
		admin.Get("/api/billing/payments", billing.Payments)
		admin.Get("/api/billing/payments/{id}", billing.Payment)
		admin.Get("/api/billing/payments/{id}/receipt", billing.Receipt)
		admin.Get("/api/billing/notifications", billing.Notifications)
		admin.Post("/api/billing/checkout", billing.Checkout)
		admin.Post("/api/billing/renew", billing.Checkout)
		admin.Post("/api/billing/cancel", billing.Cancel)
		admin.Post("/api/billing/payments/{id}/test-complete", billing.TestComplete)
		admin.Post("/api/billing/payments/{id}/reconcile", billing.Reconcile)
	})
	r.Group(func(platform chi.Router) {
		platform.Use(middleware.AuthMiddleware(cfg), billing.RequirePlatform)
		platform.Get("/api/platform/plans", billing.PlatformPlans)
		platform.Post("/api/platform/plans", billing.SavePlan)
		platform.Put("/api/platform/plans/{id}", billing.SavePlan)
		platform.Get("/api/platform/organizations", billing.PlatformList)
		platform.Get("/api/platform/subscriptions", billing.PlatformList)
		platform.Patch("/api/platform/organizations/{id}/status", billing.SetOrganizationStatus)
	})
	// Existing endpoints keep their paths and contracts.
	r.NotFound(billing.AuthenticatedLegacy(legacy).ServeHTTP)
	return r
}
