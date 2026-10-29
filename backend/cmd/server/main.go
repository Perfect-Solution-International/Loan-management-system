package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"loan-management-backend/config"
	"loan-management-backend/database"
	"loan-management-backend/handlers"
	"loan-management-backend/middleware"
	"loan-management-backend/repository"
)

func main() {
	// 1. Load configuration
	cfg := config.LoadConfig()
	if cfg.Env == "production" && (len(cfg.JWTSecret) < 32 || cfg.JWTSecret == "super-secret-jwt-key-loan-mgmt-system-psi-2026") {
		log.Fatal("Configure a unique JWT_SECRET of at least 32 characters in production")
	}

	log.Println("==================================================")
	log.Println(" Starting PSI ONE Loan Management Backend (Go/PostgreSQL)")
	log.Println("==================================================")

	// 2. Connect to PostgreSQL
	db, err := database.Connect(cfg)
	if err != nil {
		log.Printf("⚠️ Warning: PostgreSQL connection failed: %v", err)
		log.Println("👉 Please ensure PostgreSQL is running and check your .env settings.")
	} else {
		defer db.Close()
		if err := db.ValidateSaaS(); err != nil {
			log.Fatalf("SaaS database configuration: %v", err)
		}
	}
	if cfg.BillingProvider != "" && (cfg.BillingProvider != "test" || cfg.Env != "development" || len(cfg.BillingTestSecret) < 32) {
		log.Fatal("BILLING_PROVIDER is unsupported or unsafe: only an explicitly configured development test provider is available")
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	if db != nil {
		billingRepo := repository.NewBillingRepository(db)
		go func() {
			ticker := time.NewTicker(time.Minute)
			defer ticker.Stop()
			for {
				if err := billingRepo.Sweep(ctx); err != nil && ctx.Err() == nil {
					log.Printf("Billing maintenance: %v", err)
				}
				select {
				case <-ctx.Done():
					return
				case <-ticker.C:
				}
			}
		}()
	}

	r := newRouter(db, cfg)

	// 6. Start HTTP Server
	serverAddr := ":" + cfg.Port
	log.Printf("🚀 Server listening on http://localhost%s", serverAddr)
	server := &http.Server{Addr: serverAddr, Handler: r, ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 30 * time.Second, WriteTimeout: 45 * time.Second, IdleTimeout: 60 * time.Second}
	go func() {
		<-ctx.Done()
		shutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = server.Shutdown(shutdown)
	}()
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server error: %v", err)
		os.Exit(1)
	}
}

func legacyRouter(db *database.DB, cfg *config.Config) http.Handler {
	// 3. Initialize Repositories
	userRepo := repository.NewUserRepository(db)
	custRepo := repository.NewCustomerRepository(db)
	loanRepo := repository.NewLoanRepository(db)
	payRepo := repository.NewPaymentRepository(db)
	auditRepo := repository.NewAuditRepository(db)
	settingsRepo := repository.NewSettingsRepository(db)

	// 4. Initialize Handlers
	authHandler := handlers.NewAuthHandler(userRepo, auditRepo, cfg)
	custHandler := handlers.NewCustomerHandler(custRepo, auditRepo)
	loanHandler := handlers.NewLoanHandler(loanRepo, custRepo, auditRepo)
	payHandler := handlers.NewPaymentHandler(payRepo, loanRepo, auditRepo)
	portalHandler := handlers.NewPortalHandler(custRepo, loanRepo, payRepo, settingsRepo, cfg, userRepo)
	auditSettingsHandler := handlers.NewAuditAndSettingsHandler(auditRepo, settingsRepo)

	// 5. Setup Router
	r := chi.NewRouter()

	// Global Middlewares
	r.Use(chimiddleware.RequestID)
	r.Use(chimiddleware.RealIP)
	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)

	// CORS Setup
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.AllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Health Check
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		dbStatus := "CONNECTED"
		if db == nil {
			dbStatus = "DISCONNECTED"
		}
		fmt.Fprintf(w, `{"status": "UP", "service": "Loan Management Backend", "database": "%s", "version": "1.0.0"}`, dbStatus)
	})

	// Database availability middleware for API endpoints
	dbCheck := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if db == nil {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusServiceUnavailable)
				fmt.Fprintf(w, `{"error": "PostgreSQL database is currently disconnected or unavailable"}`)
				return
			}
			next.ServeHTTP(w, r)
		})
	}

	// Public Routes
	r.Route("/api", func(api chi.Router) {
		api.Use(dbCheck)
		// Auth
		api.Post("/auth/login", authHandler.Login)

		api.Post("/portal/login", portalHandler.Login)
		api.Post("/portal/register", portalHandler.Register)
		api.Group(func(portal chi.Router) {
			portal.Use(middleware.AuthMiddleware(cfg), middleware.RequireRole("Customer"), portalHandler.RequireCustomer)
			portal.Get("/portal/me", portalHandler.Snapshot)
			portal.Post("/portal/online-payments", payHandler.SubmitOnlinePayment)
		})
		api.Group(func(prot chi.Router) {
			prot.Use(middleware.AuthMiddleware(cfg), authHandler.RequireStaff(""))
			prot.Get("/auth/me", authHandler.GetMe)
			prot.Get("/users", authHandler.ListUsers)
			prot.With(authHandler.RequireStaff("admin")).Post("/users", authHandler.SaveUser)
			prot.With(authHandler.RequireStaff("admin")).Put("/users/{id}", authHandler.SaveUser)
			prot.Get("/customers/lookup", custHandler.LookupCustomer)
			prot.Get("/customers", custHandler.ListCustomers)
			prot.Get("/customers/{id}", custHandler.GetCustomer)
			prot.With(authHandler.RequireStaff("manageCustomers")).Post("/customers", custHandler.CreateCustomer)
			prot.With(authHandler.RequireStaff("manageCustomers")).Put("/customers/{id}", custHandler.UpdateCustomer)
			prot.With(authHandler.RequireStaff("manageCustomers")).Delete("/customers/{id}", custHandler.DeleteCustomer)
			prot.With(authHandler.RequireStaff("manageCustomers")).Post("/customers/{id}/documents", custHandler.AddDocument)
			prot.With(authHandler.RequireStaff("manageCustomers")).Delete("/customers/{id}/documents/{documentID}", custHandler.DeleteDocument)
			prot.Get("/loans", loanHandler.ListLoans)
			prot.Get("/loan-notes", loanHandler.GetNotes)
			prot.With(authHandler.RequireStaff("recordRepayments")).Put("/loans/{id}/note", loanHandler.SaveNote)
			prot.With(authHandler.RequireStaff("admin")).Delete("/loans/{id}", loanHandler.DeleteLoan)
			prot.Get("/loans/{id}", loanHandler.GetLoan)
			prot.With(authHandler.RequireStaff("manageCustomers")).Post("/loans", loanHandler.CreateLoan)
			prot.With(authHandler.RequireStaff("approveLoans")).Patch("/loans/{id}/status", loanHandler.UpdateLoanStatus)
			prot.Get("/payments", payHandler.ListPayments)
			prot.With(authHandler.RequireStaff("recordRepayments")).Post("/payments", payHandler.RecordPayment)
			prot.With(authHandler.RequireStaff("admin")).Put("/payments/{id}", payHandler.UpdatePayment)
			prot.With(authHandler.RequireStaff("admin")).Delete("/payments/{id}", payHandler.DeletePayment)
			prot.Get("/online-payments", payHandler.ListOnlinePayments)
			prot.With(authHandler.RequireStaff("recordRepayments")).Post("/online-payments", payHandler.SubmitOnlinePayment)
			prot.With(authHandler.RequireStaff("recordRepayments")).Patch("/online-payments/{id}/approve", payHandler.ApproveOnlinePayment)
			prot.With(authHandler.RequireStaff("recordRepayments")).Patch("/online-payments/{id}/reject", payHandler.RejectOnlinePayment)
			prot.Get("/audit-logs", auditSettingsHandler.ListAuditLogs)
			prot.Get("/settings", auditSettingsHandler.GetSettings)
			prot.With(authHandler.RequireStaff("manageSettings")).Put("/settings", auditSettingsHandler.UpdateSettings)
		})
	})

	return r
}
