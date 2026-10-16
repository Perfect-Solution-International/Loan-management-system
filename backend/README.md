# PSI ONE Loan Management System - Go & PostgreSQL Backend

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
│   │   └── 001_init.sql             # Complete PostgreSQL schema migrations
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
> මෙහිදී PostgreSQL container එක සෑදී `001_init.sql` සහ `seed.sql` ස්වයංක්‍රීයව execute වේ.

#### ක්‍රමය B: Local PostgreSQL (pgAdmin හෝ psql)
1. PostgreSQL තුළ `loan_management_db` නමින් database එකක් සාදන්න:
   ```sql
   CREATE DATABASE loan_management_db;
   ```
2. Schema සහ Seed data run කරන්න:
   ```bash
   psql -U postgres -d loan_management_db -f database/migrations/001_init.sql
   psql -U postgres -d loan_management_db -f database/seed.sql
   ```

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

