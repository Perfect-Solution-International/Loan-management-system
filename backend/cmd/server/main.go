package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

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
	}

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
		fmt.Fprintf(w, `{"status": "UP", "service": "Loan Management Backend", "version": "1.0.0"}`)
	})

	// Public Routes
	r.Route("/api", func(api chi.Router) {
		// Auth
		api.Post("/auth/login", authHandler.Login)

		// Public Borrower Lookup (for customer portal)
		api.Get("/customers/lookup", custHandler.LookupCustomer)

		// Public/Protected Data Routes
		// (In production, wrap with middleware.AuthMiddleware(cfg))
		api.Group(func(pub chi.Router) {
			// Customers
			pub.Get("/customers", custHandler.ListCustomers)
			pub.Get("/customers/{id}", custHandler.GetCustomer)
			pub.Post("/customers", custHandler.CreateCustomer)
			pub.Put("/customers/{id}", custHandler.UpdateCustomer)
			pub.Delete("/customers/{id}", custHandler.DeleteCustomer)

			// Loans
			pub.Get("/loans", loanHandler.ListLoans)
			pub.Get("/loans/{id}", loanHandler.GetLoan)
			pub.Post("/loans", loanHandler.CreateLoan)
			pub.Patch("/loans/{id}/status", loanHandler.UpdateLoanStatus)

			// Repayments / Payments
			pub.Get("/payments", payHandler.ListPayments)
			pub.Post("/payments", payHandler.RecordPayment)

			// Online Payment Slips
			pub.Get("/online-payments", payHandler.ListOnlinePayments)
			pub.Post("/online-payments", payHandler.SubmitOnlinePayment)
			pub.Patch("/online-payments/{id}/approve", payHandler.ApproveOnlinePayment)
			pub.Patch("/online-payments/{id}/reject", payHandler.RejectOnlinePayment)

			// Audit Logs
			pub.Get("/audit-logs", auditSettingsHandler.ListAuditLogs)

			// System Settings
			pub.Get("/settings", auditSettingsHandler.GetSettings)
			pub.Put("/settings", auditSettingsHandler.UpdateSettings)
		})

		// Protected Routes requiring JWT Token
		api.Group(func(prot chi.Router) {
			prot.Use(middleware.AuthMiddleware(cfg))
			prot.Get("/auth/me", authHandler.GetMe)
			prot.Get("/users", authHandler.ListUsers)
		})
	})

	// 6. Start HTTP Server
	serverAddr := ":" + cfg.Port
	log.Printf("🚀 Server listening on http://localhost%s", serverAddr)
	if err := http.ListenAndServe(serverAddr, r); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server error: %v", err)
		os.Exit(1)
	}
}

