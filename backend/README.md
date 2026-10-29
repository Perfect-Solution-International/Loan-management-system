# PSI ONE Loan Management System - Go & PostgreSQL Backend

For organization ownership, subscriptions, the versioned migration runner, platform administrators and payment configuration, see [the SaaS deployment guide](../docs/saas-subscriptions.md). Apply migration 011 before starting this backend. Live subscription checkout is disabled by default; the included adapter is development-only.

Microfinance & Loan Management System එක සඳහා Go (Golang) සහ PostgreSQL පදනම් කරගත් high-performance, production-ready REST API backend එක.

---

## 🛠️ තාක්ෂණික එකතුව (Tech Stack)

- **Language:** Go (Golang 1.22+)
- **Database:** PostgreSQL (with connection pooling)
- **Router:** Chi Router (`github.com/go-chi/chi/v5`)
- **Authentication:** JWT (JSON Web Tokens) + Bcrypt Password Hashing
- **CORS:** `github.com/go-chi/cors`
- **Environment:** Godotenv (`.env`)

---

## 📂 Backend ව්‍යුහය (Project Structure)

```text
backend/
├── cmd/
│   └── server/
│       └── main.go                  # Main HTTP server entry point
├── config/
│   └── config.go                    # Configuration loader (.env)
├── database/
│   ├── database.go                  # PostgreSQL connection pool manager
│   ├── migrations/
│   │   ├── 001_create_users.sql
│   │   ├── 002_create_customers.sql
│   │   ├── 003_create_loans.sql
│   │   ├── 004_create_payments.sql
│   │   ├── 005_create_audit_logs.sql
│   │   ├── 006_create_system_settings.sql
│   │   ├── 007_create_online_payments.sql
│   │   ├── 008_create_loan_notes.sql
│   │   ├── 009_create_roles.sql
│   │   └── 010_link_users_role.sql
│   └── seed.sql                     # Initial demo data & seeds
├── handlers/
│   ├── auth_handler.go              # Login, me, user management
│   ├── customer_handler.go          # Customer CRUD & Borrower lookup
│   ├── loan_handler.go              # Loan applications, disbursements, status
│   ├── payment_handler.go           # Collections, repayments, receipts
│   └── audit_and_settings_handler.go# Audit logs & System settings
├── middleware/
│   ├── auth.go                      # JWT verification & Role guards
│   └── cors.go                      # Cross-Origin resource sharing
├── models/
│   └── models.go                    # Go structs for all entities
├── repository/
│   ├── user_repo.go                 # SQL queries for users/staff
│   ├── customer_repo.go             # SQL queries for customers
│   ├── loan_repo.go                 # SQL queries for loans
│   ├── payment_repo.go              # SQL queries for payments
│   └── audit_and_settings_repo.go   # SQL queries for logs & settings
├── .env                             # Active environment configuration
├── .env.example                     # Sample environment file
├── docker-compose.yml               # One-click PostgreSQL launcher
├── go.mod                           # Go dependencies
└── README.md
```

---

## 🚀 පියවරෙන් පියවර ආරම්භ කිරීම (Step-by-Step Setup Guide)

### 1. PostgreSQL Database එක ආරම්භ කිරීම

ඔබට පහත ක්‍රම 2 න් එකක් තෝරාගත හැක:

#### ක්‍රමය A: Docker මඟින් (ඉතාමත් පහසුයි - One Command)
`backend` ෆෝල්ඩරය තුළ සිට terminal එකේ ධාවනය කරන්න:
```bash
cd backend
docker-compose up -d
```
> On a fresh PostgreSQL volume, Docker runs the numbered migrations in order, then `seed.sql`. Existing volumes are not migrated automatically.

#### ක්‍රමය B: Local PostgreSQL (pgAdmin හෝ psql)
1. PostgreSQL තුළ `loan_management_db` නමින් database එකක් සාදන්න:
   ```sql
   CREATE DATABASE loan_management_db;
   ```
2. Schema සහ Seed data run කරන්න:
   ```powershell
   $migrationArgs = @()
   Get-ChildItem database/migrations/*.sql | Sort-Object Name | ForEach-Object {
       $migrationArgs += "-f", $_.FullName
   }
   psql -X -U postgres -d loan_management_db -v ON_ERROR_STOP=1 --single-transaction @migrationArgs -f database/seed.sql
   ```

Each table has its own create migration with its indexes and related sequence. Later migrations add relationships or other schema changes. Apply all files in filename order, then seed data. The SQL uses `IF NOT EXISTS` and seeds use `ON CONFLICT DO NOTHING`, so existing tables and seed records are preserved. Existing installations that ran `001_init.sql` and `002_frontend_integration.sql` can apply the new files without resetting the database.

The only system roles are `Admin`, `Staff`, and `Customer`. `010_link_users_role.sql` maps legacy administrator accounts to Admin and other legacy staff accounts to Staff, preserving permission grants. Both role names and user assignments are constrained to these three values. Rerun the existing migrations in order to upgrade an existing database.

---

### 2. Environment Variables (.env) සැකසීම

`backend/.env` ගොනුවේ ඔබගේ database credentials ඇතුළත් කරන්න:
```env
PORT=8080
ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=loan_management_db
DB_SSLMODE=disable

JWT_SECRET=super-secret-jwt-key-loan-mgmt-system-psi-2026
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

---

### 3. Go Dependencies බාගත කර Server එක Run කිරීම

```bash
cd backend
go mod download
go run cmd/server/main.go
```

Server එක සාර්ථකව run වූ විට:
```text
==================================================
 Starting PSI ONE Loan Management Backend (Go/PostgreSQL)
==================================================
 Connected to PostgreSQL database [localhost:5432/loan_management_db]
 Server listening on http://localhost:8080
```

---

## 📡 ප්‍රධාන REST API Endpoints

### 🔐 Authentication (`/api/auth`)
| Method | Endpoint | විස්තරය |
|---|---|---|
| `POST` | `/api/auth/login` | Staff Login (Email + Password) -> JWT Token |
| `GET` | `/api/auth/me` | Logged-in Staff User Profile (Bearer token) |
| `GET` | `/api/users` | List all staff members |

### 👥 Customers / Borrowers (`/api/customers`)
| Method | Endpoint | විස්තරය |
|---|---|---|
| `GET` | `/api/customers` | Get all customers |
| `GET` | `/api/customers/{id}` | Get customer details by ID |
| `GET` | `/api/customers/lookup?query={NIC/Phone}` | Customer Portal Borrower Account Verification |
| `POST` | `/api/customers` | Register new customer |
| `PUT` | `/api/customers/{id}` | Update customer |
| `DELETE` | `/api/customers/{id}` | Delete customer |

### 💼 Loans (`/api/loans`)
| Method | Endpoint | විස්තරය |
|---|---|---|
| `GET` | `/api/loans` | Get all loans (filter with `?customerId=...`) |
| `GET` | `/api/loans/{id}` | Get loan by ID |
| `POST` | `/api/loans` | Disburse new loan |
| `PATCH` | `/api/loans/{id}/status` | Update loan status (Active, Completed, Rejected) |

### 💵 Repayments & Collections (`/api/payments`)
| Method | Endpoint | විස්තරය |
|---|---|---|
| `GET` | `/api/payments` | Get all payments (filter with `?loanId=...` or `?customerId=...`) |
| `POST` | `/api/payments` | Record daily collection / installment payment |

### 📋 Audit Logs & Settings
| Method | Endpoint | විස්තරය |
|---|---|---|
| `GET` | `/api/audit-logs` | Live activity audit trail |
| `GET` | `/api/settings` | Get loan configuration & interest rates |
| `PUT` | `/api/settings` | Update system settings |


### Local seed accounts

| Email | Role | Password |
|---|---|---|
| admin@psione.lk | Admin | admin123 |
| staff@psione.lk | Staff | staff123 |
| customer@psione.lk | Customer | customer123 |

The Customer seed includes a customer portal profile. Seed reruns repair the original invalid seed password hash but preserve subsequently changed passwords. Staff access is governed by individual permission grants; Customer tokens cannot access staff endpoints.
