# PSI One Loan Management System (PSI One LMS)

[![Next.js](https://img.shields.io/badge/Next.js-16.4.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.3.0-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=for-the-badge)](#license)

> A modern, responsive web application designed for microfinance institutions, credit cooperatives, and lending agencies to streamline borrower onboarding, automated loan calculation, repayment collection with instant receipt generation, portfolio risk monitoring, and system configuration.

---


## Table of Contents

- [Overview](#overview)
- [Features](#features)
  - [Customer Directory & KYC Management](#customer-directory--kyc-management)
  - [Loan Origination & Financial Calculator](#loan-origination--financial-calculator)
  - [Repayment Processing & Receipt Generation](#repayment-processing--receipt-generation)
  - [Financial Analytics & Portfolio Reporting](#financial-analytics--portfolio-reporting)
  - [Lending Rules & System Configuration](#lending-rules--system-configuration)
  - [Staff Management & Access Control](#staff-management--access-control)
  - [Offline-Capable State Persistence](#offline-capable-state-persistence)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
  - [Design Pattern](#design-pattern)
  - [Application Architecture](#application-architecture)
  - [Data Flow](#data-flow)
- [Folder Structure](#folder-structure)
- [Database & Data Models](#database--data-models)
  - [Storage Strategy](#storage-strategy)
  - [Core Entity Schema](#core-entity-schema)
  - [Entity Relationship Diagram (ERD)](#entity-relationship-diagram-erd)
- [API Documentation](#api-documentation)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the Project](#running-the-project)
- [Screenshots](#screenshots)
- [Authentication Flow](#authentication-flow)
- [Error Handling](#error-handling)
- [Performance Optimizations](#performance-optimizations)
- [Security](#security)
- [Deployment](#deployment)
- [Future Improvements](#future-improvements)
- [Contributing](#contributing)
- [License](#license)
- [Author](#author)


---

## Overview

### What the Project Does
**PSI One Loan Management System (PSI One LMS)** is an administrative web platform designed to manage the end-to-end lifecycle of micro-loans and credit facilities. It facilitates customer onboarding with comprehensive KYC document verification, automates upfront fee deductions and interest calculations, records daily loan repayments with instant printable receipts, and tracks portfolio delinquency in real time.

### The Problem It Solves
Traditional micro-lending operations often rely on fragmented spreadsheets, paper ledgers, or disjointed desktop software. These manual workflows lead to:
- Calculation errors in upfront interest and capital deductions.
- Missing or disorganized physical identity documents (NICs, salary slips, agreements).
- Delayed visibility into overdue installments and portfolio risk.
- Disorganized collection logging without standardized audit receipts.

PSI One solves these operational challenges by centralizing customer records, automating transparent financial formulas, generating sequential receipts, and providing real-time portfolio dashboards.

### Who It Is For
- **Microfinance Institutions (MFIs)** & Community Credit Cooperatives.
- **Credit Lending Companies** managing daily, weekly, or monthly repayment schedules.
- **Loan Officers & Field Collection Agents** requiring quick access to borrower balances and history.
- **Finance Managers & Auditors** monitoring portfolio yield, disbursement volume, and default rates.
*(Customized out-of-the-box for Sri Lankan administrative districts and Sri Lankan Rupee `LKR` currency formatting).*

### Main Objectives
1. **Accelerate Loan Processing:** Reduce the turnaround time for borrower verification and contract creation from days to minutes.
2. **Ensure Financial Transparency:** Provide borrowers with clear breakdowns of gross principal, capital deductions, net disbursement, and installment schedules.
3. **Streamline Collections:** Facilitate seamless recording of cash/bank transfer collections with instant digital receipt issuance.
4. **Resilient Local Persistence:** Maintain full functionality with offline-first client-side state synchronization backed by browser storage.

---

## Features

### Customer Directory & KYC Management
- **Automated Customer ID Generation:** Sequential assignment of unique customer identifiers (`CUS-001`, `CUS-002`, ...).
- **Comprehensive Borrower Profiles:** Captures full name, National Identity Card (NIC) number, date of birth, gender, primary/secondary contact numbers, email, occupation, and monthly income.
- **Sri Lankan Geographic Coverage:** Built-in district selection covering all 25 administrative districts (Colombo, Gampaha, Kandy, Galle, etc.) alongside village and town details.
- **Emergency & Guarantor Details:** Captures emergency contacts and complete guarantor profiles (name, NIC, phone, relationship).
- **Dedicated KYC Document Handling:**
  - Borrower portrait photo upload and preview.
  - Dedicated uploads for National Identity Card (**NIC Front** and **NIC Back**).
  - Multi-document attachment support for salary slips, utility bills, business registration certificates, and agreements.
- **Existing Loan Onboarding:** Ability to capture pre-existing loans, prior installment payments, last payment dates, and custom initial outstanding balances when onboarding legacy borrowers.
- **Directory Search & Status Filtering:** Instant client-side search across borrower names, NIC numbers, telephone numbers, and towns.

### Loan Origination & Financial Calculator
- **Guided 3-Step Loan Origination Workflow:**
  1. *Select Borrower:* Real-time searchable customer directory.
  2. *Review Customer Profile:* Verification modal displaying borrower photo, NIC, current outstanding liabilities, attached documents, and prior repayment history.
  3. *Loan Terms & Deductions Form:* Automated computation and loan agreement generation.
- **Flexible Rate & Repayment Periods:**
  - Rate periods: Daily, Weekly, or Monthly.
  - Repayment frequencies: Daily, Weekly, or Monthly.
- **Automated Upfront Fee & Deduction Engine:**
  - Capital deductions (retained upfront).
  - Interest deductions (retained upfront or collected via installments).
  - Mandatory processing and administrative/legal fees.
- **Real-Time Financial Calculation:**
  $$\text{Net Disbursement} = \max(0, \text{Gross Principal} - \text{Total Deductions})$$
  $$\text{Total Interest} = \frac{\text{Gross Principal} \times \text{Interest Rate}}{100}$$
  $$\text{Total Repayment} = \text{Gross Principal} + \text{Total Interest}$$
  $$\text{Installment Amount} = \frac{\text{Total Repayment}}{\text{Number of Installments}}$$
- **Portfolio Directory:** Central loan register displaying loan numbers (`LN-YYYY-XXX`), borrowers, principal, frequency, balance due, and status badges (`Active`, `Pending`, `Completed`, `Overdue`).

### Repayment Processing & Receipt Generation
- **Fast Repayment Logging:** Record payments against active or overdue loans with single-click selection.
- **Payment Allocation:** Split payment entries by Capital, Interest, or Other fees.
- **Multi-Channel Tender Types:** Cash, Bank Transfer, or Cheque.
- **Dynamic Balance Settlement:** Automatically updates total loan paid figures and automatically switches loan status to `Completed` once the balance is fully settled.
- **Printable Digital Receipts:**
  - Auto-generated receipt numbers (`REC-YYYY-XXXX`).
  - Borrower identity, loan reference, date, collector name, payment breakdown, and remaining balance.
  - Single-click print functionality (`window.print()`) formatted for receipt printers.
- **Collections History Ledger:** Searchable transaction history with filtering by payment type and receipt re-printing.

### Financial Analytics & Portfolio Reporting
- **Dual-View Reporting Hub:**
  - *Collections Ledger:* Granular transaction-by-transaction collection tracking.
  - *Portfolio Health & Risk Analysis:* Executive view of capital deployed and portfolio delinquency.
- **Multi-Period Filtering:** Filter collections and portfolio performance by Daily, Weekly, Monthly, or All-Time.
- **Financial KPIs & Metrics:**
  - Total Disbursed Capital.
  - Total Expected Repayment & Outstanding Receivables.
  - Total Collected Capital vs. Total Interest Earned.
  - Overdue Portfolio at Risk (PAR).
  - Collection Efficiency Percentage ($\frac{\text{Total Collections}}{\text{Total Expected}} \times 100$).
- **CSV Data Export:** One-click CSV generation for both transaction ledgers (`collections_report_*.csv`) and portfolio health matrices (`portfolio_report_*.csv`).

### Lending Rules & System Configuration
- **Global Interest Defaults:** Configurable default monthly, weekly, and daily interest rates.
- **Upfront Deduction Settings:** Default capital deduction rates, processing fees, administrative fees, late fee percentages, and grace period days.
- **Interactive Loan Simulator:** Embedded test calculator allowing administrators to simulate loan disbursements and installment amounts before saving rule modifications.
- **System Defaults Restore:** One-click rollback to default system parameters.

### Staff Management & Access Control
- **Multi-Role User Directory:** Pre-configured roles for `Admin`, `Staff`, and `Customer`.
- **Branch Allocation:** Assign personnel across branch offices (Colombo Central, Gampaha, Kandy, Galle, Kurunegala, Kalutara, Head Office).
- **Granular Permission Matrix:**
  - Approve Loans
  - Record Repayments
  - Export Reports
  - Manage Settings
  - Manage Customers
- **Staff Lifecycle:** Add staff members, update branch assignments, edit permissions, and toggle active/inactive status.

### Offline-Capable State Persistence
- **Client-Side Data Synchronization:** React Context state manager (`DataProvider`) synchronized automatically with browser `localStorage`.
- **Pre-Seeded Demo Data:** Built-in demo datasets for immediate trial and demonstration without mandatory database setup.

---

## Tech Stack

| Category | Technology | Version | Purpose / Notes |
|:---|:---|:---|:---|
| **Frontend Framework** | [Next.js](https://nextjs.org/) | `16.4.0` | App Router, Server Components, client-side routing |
| **UI Library** | [React](https://react.dev/) | `19.3.0` | Modern UI rendering and state hooks |
| **Programming Language** | [TypeScript](https://www.typescriptlang.org/) | `^5.0.0` | Strict type safety and data models |
| **Styling & CSS** | [Tailwind CSS](https://tailwindcss.com/) | `^4.0.0` | Utility-first styling with modern Turbopack integration |
| **Turbopack Loader** | `@tailwindcss/turbopack` | `^4.0.0` | Ultra-fast CSS bundler plugin for Next.js 16 |
| **Icons** | [Lucide React](https://lucide.dev/) | `^1.55.0` | Clean, modern iconography |
| **State Management** | React Context API | Native | Centralized `DataProvider` with custom hook `useData` |
| **Client Storage** | Browser `localStorage` | Web API | Zero-config client-side persistence across sessions |
| **Database** | *Not implemented* | — | Scaffolded in `src/lib/db/` (ready for Prisma/PostgreSQL) |
| **API Backend** | *Not implemented* | — | Scaffolded in `src/app/api/` (ready for Next.js route handlers) |
| **Authentication** | *Prototype UI* | — | Interactive login UI at `/login`; backend JWT not implemented |
| **Testing** | *Not implemented* | — | Test runner not yet configured |
| **Linter & Formatter** | [ESLint](https://eslint.org/) | `^9.0.0` | Configured with `eslint-config-next` (v16.4.0) |

---

## Architecture

### Design Pattern
The application utilizes a **Modular Layered Architecture** with the **React Context / Provider Pattern**:
- **Presentation Layer (`src/app/`):** Next.js App Router route groups separating public authentication pages `(auth)` from authenticated administrative pages `(dashboard)`.
- **Component Layer (`src/components/`):** Reusable layout headers, sidebars, interactive modals, and forms.
- **Domain & Types Layer (`src/types/`):** Centralized TypeScript interfaces defining models for Customers, Loans, Payments, Documents, Settings, and Staff.
- **Service & Calculations Layer (`src/lib/`):** Pure mathematical calculation utilities (`loan-calculator.ts`) and mock seed data (`demo-data.ts`).
- **State Synchronization Layer (`src/providers/`):** Central `DataProvider` that provides global reactive state and serializes mutations into `localStorage`.

### Application Architecture

```mermaid
graph TD
    subgraph UI_Layer ["Presentation & UI Layer"]
        AuthRoute["(auth)/login"]
        DashRoute["(dashboard)/dashboard"]
        CustRoute["(dashboard)/customers"]
        LoanRoute["(dashboard)/loans"]
        RepayRoute["(dashboard)/repayments"]
        ReportRoute["(dashboard)/reports"]
        SettingRoute["(dashboard)/settings"]
    end

    subgraph State_Layer ["State & Business Logic Layer"]
        DataProvider["DataProvider (React Context)"]
        Calculator["Loan Calculator Engine (src/lib/loan-calculator.ts)"]
        Formatters["Currency & Date Formatters (src/constants)"]
    end

    subgraph Storage_Layer ["Data & Storage Layer"]
        LS[("Browser localStorage\n(psi_customers, psi_loans,\npsi_payments, psi_settings)")]
        SeedData["Initial Demo Seed Data (src/lib/demo-data.ts)"]
        DB["Persistent Database (PostgreSQL/Prisma)\n[Not implemented - Scaffolded]"]
    end

    UI_Layer --> DataProvider
    DataProvider --> Calculator
    DataProvider --> Formatters
    DataProvider <--> LS
    DataProvider -. Fallback Initial .-> SeedData
    DataProvider -. Future API Bridge .-> DB
```

### Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor Officer as Loan Officer
    participant UI as Loan Origination View (/loans/new)
    participant Calc as Loan Calculator (lib/loan-calculator.ts)
    participant Context as DataProvider (React Context)
    participant Storage as Browser LocalStorage

    Officer->>UI: Selects borrower and inputs principal, rate, duration & deductions
    UI->>Calc: calculateLoanDetails(gross, capitalDed, interestDed, rate, duration)
    Calc-->>UI: Returns netDisbursement, totalInterest, installmentAmount
    Officer->>UI: Submits new loan agreement
    UI->>Context: addLoan(newLoanRecord)
    Context->>Context: Updates in-memory loans array
    Context->>Storage: setItem("psi_loans", JSON.stringify(loans))
    Context-->>UI: State updated successfully
    UI-->>Officer: Redirects to /loans/[loanId] with contract summary
```

---

## Folder Structure

```text
loan-management/
├── public/                     # Static assets and placeholders
│   ├── icons/                  # Application icon assets
│   ├── images/                 # Image assets
│   ├── logos/                  # Branding and company logos
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── src/
│   ├── app/                    # Next.js App Router directory
│   │   ├── (auth)/             # Authentication route group
│   │   │   ├── login/          # Login page view
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx      # Auth shell layout
│   │   ├── (dashboard)/        # Administrative dashboard route group
│   │   │   ├── audit-logs/     # Audit trail page (scaffolded)
│   │   │   │   └── page.tsx
│   │   │   ├── collections/    # Daily collections page (scaffolded)
│   │   │   │   └── page.tsx
│   │   │   ├── customers/      # Customer directory
│   │   │   │   ├── [customerId]/# Customer profile view
│   │   │   │   │   ├── edit/   # Customer profile editor
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── new/        # Customer onboarding & KYC registration
│   │   │   │   │   └── page.tsx
│   │   │   │   └── page.tsx    # Customer list & search
│   │   │   ├── dashboard/      # Executive metrics overview
│   │   │   │   └── page.tsx
│   │   │   ├── loans/          # Loan portfolio register
│   │   │   │   ├── [loanId]/   # Loan record details & summary
│   │   │   │   │   ├── schedule/# Loan repayment schedule (scaffolded)
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── new/        # 3-step loan origination wizard
│   │   │   │   │   └── page.tsx
│   │   │   │   └── page.tsx    # Loan list & search
│   │   │   ├── overdue/        # Overdue loan tracking (scaffolded)
│   │   │   │   └── page.tsx
│   │   │   ├── repayments/     # Collections recording & receipt printing
│   │   │   │   └── page.tsx
│   │   │   ├── reports/        # Financial analytics & CSV export
│   │   │   │   └── page.tsx
│   │   │   ├── settings/       # Lending rules & staff management
│   │   │   │   └── page.tsx
│   │   │   ├── staff/          # Staff redirect route (/settings?tab=staff)
│   │   │   │   └── page.tsx
│   │   │   ├── layout.tsx      # Dashboard shell with sidebar & topbar
│   │   │   └── page.tsx        # Dashboard root redirection
│   │   ├── api/                # Backend API route handlers (scaffolded)
│   │   │   └── .gitkeep
│   │   ├── documents/          # Private document storage guidelines
│   │   │   └── page.tsx
│   │   ├── globals.css         # Tailwind CSS directives & global styling
│   │   └── layout.tsx          # Root layout with DataProvider wrapper
│   ├── components/             # Reusable UI component library
│   │   ├── forms/              # Input forms (e.g. NewLoanForm.tsx)
│   │   ├── layout/             # Layout navigation components (Sidebar.tsx)
│   │   ├── modals/             # Modal dialogs (CustomerProfileModal.tsx)
│   │   ├── shared/             # Shared presentation widgets
│   │   ├── tables/             # Shared data tables
│   │   └── ui/                 # Atomic UI primitives
│   ├── config/                 # Application configuration (scaffolded)
│   ├── constants/              # System constants & currency formatter (LKR)
│   │   └── index.ts
│   ├── hooks/                  # Custom React hooks (scaffolded)
│   ├── lib/                    # Core business logic and demo data
│   │   ├── auth/               # Auth utilities (scaffolded)
│   │   ├── db/                 # Database clients (scaffolded)
│   │   ├── permissions/        # Permission checks (scaffolded)
│   │   ├── storage/            # File storage utilities (scaffolded)
│   │   ├── utils/              # Utility helpers (scaffolded)
│   │   ├── demo-data.ts        # Seed data (customers, loans, payments, staff)
│   │   └── loan-calculator.ts  # Mathematical loan deduction & installment engine
│   ├── modules/                # Feature-based modular components
│   │   └── dashboard/          # Dashboard widgets (dashboard-page.tsx)
│   ├── providers/              # React Context state management
│   │   └── data-provider.tsx   # DataProvider & useData hook with localStorage sync
│   └── types/                  # Global TypeScript type definitions
│       ├── index.ts            # Primary domain models (Customer, Loan, Payment, etc.)
│       └── loan.ts             # Loan calculation & form schema types
├── .env.example                # Environment variable template
├── .gitignore                  # Git ignore definitions
├── AGENTS.md                   # AI agent conventions and Next.js notices
├── eslint.config.mjs           # Flat ESLint configuration
├── next.config.ts              # Next.js 16 configuration (Turbopack, flags)
├── package.json                # Project dependencies and script declarations
├── README.md                   # Project documentation
└── tsconfig.json               # TypeScript compiler configuration
```

### Folder Explanations
- **`src/app/`**: Next.js App Router containing route segments and page components. Organized into route groups `(auth)` for public authentication views and `(dashboard)` for core administrative modules.
- **`src/components/`**: Modular, reusable UI components including forms, navigation sidebars, and modals.
- **`src/lib/`**: Contains core mathematical formulas (`loan-calculator.ts`), pre-seeded demo records (`demo-data.ts`), and architectural scaffolds for database and auth clients.
- **`src/providers/`**: Holds `DataProvider`, the React Context provider that orchestrates state transitions and synchronizes all changes with the browser's `localStorage`.
- **`src/types/`**: Strict TypeScript interfaces and types for all entities, form schemas, and financial calculations.
- **`src/constants/`**: Formatting helpers, including `MONEY()`, which formats numeric values into Sri Lankan Rupee currency strings (`LKR`).

---

## Database & Data Models

### Storage Strategy
The current application uses a **Client-Side Reactive Cache** backed by browser `localStorage`:
- `psi_customers`: Serialized array of `Customer` entities.
- `psi_loans`: Serialized array of `Loan` entities.
- `psi_payments`: Serialized array of `Payment` transaction entities.
- `psi_documents`: Serialized array of uploaded `CustomerDocument` entities.
- `psi_settings`: Serialized `SystemSettings` object.
- `psi_staff_users`: Serialized array of `StaffUser` administrative profiles.

> [!NOTE]
> Persistent server-side database connectivity (e.g. PostgreSQL with Prisma ORM) is scaffolded in `src/lib/db/` but is **Not implemented** in the active build.

### Core Entity Schema

#### Customer
| Field | Type | Description |
|:---|:---|:---|
| `id` | `string` | Unique identifier (e.g., `CUS-001`) |
| `name` / `fullName` | `string` | Customer primary & full legal name |
| `nic` | `string` | Sri Lankan National Identity Card Number |
| `phone` / `alternatePhone` | `string` | Primary and backup telephone numbers |
| `email` | `string` (optional) | Customer email address |
| `dob` | `string` (optional) | Date of birth (`YYYY-MM-DD`) |
| `gender` | `string` (optional) | Gender identifier |
| `address`, `village`, `town`, `district` | `string` | Complete residential geographic address |
| `monthlyIncome` | `number` | Monthly earned income in LKR |
| `status` | `CustomerStatus` | `Active`, `Inactive`, or `Suspended` |
| `photoUrl` | `string` (optional) | Borrower portrait image URL |
| `nicFrontUrl`, `nicBackUrl` | `string` (optional) | URLs/Base64 of NIC cards |
| `guarantorName`, `guarantorNic`, `guarantorPhone` | `string` (optional) | Guarantor profile information |

#### Loan
| Field | Type | Description |
|:---|:---|:---|
| `id` / `loanNo` | `string` | Unique loan code (e.g., `LN-2026-001`) |
| `customerId` | `string` | Foreign key referencing `Customer.id` |
| `principal` / `amount` | `number` | Gross loan amount borrowed in LKR |
| `capitalDeduction` | `number` | Upfront capital deduction retained |
| `interestDeduction` | `number` | Upfront interest deduction retained |
| `otherFees` | `number` | Administrative and processing fees |
| `interestRate` | `number` | Interest rate percentage |
| `ratePeriod` | `string` | `Daily`, `Weekly`, or `Monthly` |
| `repaymentFrequency` | `string` | `Daily`, `Weekly`, or `Monthly` |
| `duration` | `number` | Duration in total installment counts |
| `issueDate` | `string` | Date of loan agreement (`YYYY-MM-DD`) |
| `firstPaymentDate` | `string` | Date first repayment is due |
| `status` | `LoanStatus` | `Active`, `Pending`, `Completed`, `Overdue`, `Rejected` |
| `interest` | `number` | Calculated total interest payable |
| `totalRepayment` | `number` | Total repayable amount ($\text{Principal} + \text{Interest}$) |
| `netDisbursement` | `number` | Actual cash handed to borrower |
| `installment` | `number` | Regular repayment installment amount |

#### Payment
| Field | Type | Description |
|:---|:---|:---|
| `id` | `string` | Unique transaction ID (e.g., `PAY-001`) |
| `loanId` | `string` | Foreign key referencing `Loan.id` |
| `customerId` | `string` | Foreign key referencing `Customer.id` |
| `amount` | `number` | Amount paid in LKR |
| `date` | `string` | Payment date (`YYYY-MM-DD`) |
| `type` | `string` | `Capital`, `Interest`, or `Other` |
| `method` | `string` | `Cash`, `Bank Transfer`, or `Cheque` |
| `receiptNo` | `string` | Formal receipt reference (e.g., `REC-2026-8801`) |
| `collectedBy` | `string` | Name of collecting officer |

### Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    CUSTOMER ||--o{ LOAN : borrows
    CUSTOMER ||--o{ CUSTOMER_DOCUMENT : owns
    CUSTOMER ||--o{ PAYMENT : pays
    LOAN ||--o{ PAYMENT : collects
    STAFF_USER ||--o{ PAYMENT : records

    CUSTOMER {
        string id PK
        string fullName
        string nic UK
        string phone
        string address
        string town
        string district
        float monthlyIncome
        string status
    }

    LOAN {
        string id PK
        string customerId FK
        string loanNo UK
        float principal
        float capitalDeduction
        float interestDeduction
        float interestRate
        string repaymentFrequency
        int duration
        float totalRepayment
        float netDisbursement
        float installment
        string status
    }

    PAYMENT {
        string id PK
        string loanId FK
        string customerId FK
        float amount
        string date
        string type
        string method
        string receiptNo UK
        string collectedBy
    }

    CUSTOMER_DOCUMENT {
        string id PK
        string customerId FK
        string title
        string type
        string fileName
        string fileSize
        string fileUrl
    }

    STAFF_USER {
        string id PK
        string name
        string email UK
        string role
        string branch
        string status
    }
```

---

## API Documentation

> [!IMPORTANT]
> The backend REST API endpoints under `src/app/api/` are **Not implemented** (currently scaffolded with `.gitkeep`). The application presently executes all operations on the client side via the `DataProvider` context.
>
> The table below outlines the planned REST API specification designed to interface with the current frontend data contracts.

| Method | Endpoint | Description | Authentication | Status |
|:---|:---|:---|:---|:---|
| `POST` | `/api/auth/login` | Authenticate staff credentials & issue session/JWT | Public | *Not implemented* |
| `POST` | `/api/auth/logout` | Revoke active staff token | Bearer Token | *Not implemented* |
| `GET` | `/api/customers` | Retrieve paginated borrower directory | Bearer Token | *Not implemented* |
| `POST` | `/api/customers` | Register a new customer with KYC data | Bearer Token | *Not implemented* |
| `GET` | `/api/customers/:id` | Fetch full customer profile with linked loans | Bearer Token | *Not implemented* |
| `PUT` | `/api/customers/:id` | Update borrower details | Bearer Token | *Not implemented* |
| `GET` | `/api/loans` | List loans with status and customer filters | Bearer Token | *Not implemented* |
| `POST` | `/api/loans` | Disburse/create a new loan agreement | Bearer Token | *Not implemented* |
| `GET` | `/api/loans/:id` | Retrieve single loan breakdown and payments | Bearer Token | *Not implemented* |
| `POST` | `/api/payments` | Record a repayment and generate receipt | Bearer Token | *Not implemented* |
| `POST` | `/api/documents/upload` | Securely upload KYC documents to storage | Bearer Token | *Not implemented* |
| `GET` | `/api/settings` | Fetch global interest rules and fees | Bearer Token | *Not implemented* |
| `PUT` | `/api/settings` | Update system lending rules | Admin | *Not implemented* |
| `GET` | `/api/staff` | List staff users and permissions | Admin | *Not implemented* |

---

## Installation

### Prerequisites
- [Node.js](https://nodejs.org/) version **20.x** or **22.x** LTS.
- [npm](https://www.npmjs.com/) (version 10 or newer) or compatible package manager (`pnpm`, `yarn`).
- Git installed on your local workstation.

### Step-by-Step Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Perfect-Solution-International/Loan-management-system.git
   cd Loan-management-system
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```

   > [!NOTE]
   > On Windows PowerShell, if an execution policy error occurs when running `npm`, invoke commands using `npm.cmd` instead:
   > ```powershell
   > npm.cmd install
   > ```

3. **Configure environment variables:**
   The client-side prototype requires no mandatory environment variables. Create a local environment file if custom overrides are needed:
   ```bash
   cp .env.example .env.local
   ```

4. **Verify TypeScript type checking:**
   ```bash
   npm run typecheck
   ```
   *(Or `npm.cmd run typecheck` on Windows)*

5. **Start the local development server:**
   ```bash
   npm run dev
   ```

6. **Access the application:**
   Open your browser and navigate to:
   ```text
   http://localhost:3000
   ```

---

## Environment Variables

| Variable | Description | Required | Default / Example |
|:---|:---|:---|:---|
| `NODE_ENV` | Runtime environment mode | No | `development` |
| `PORT` | Local server port | No | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | *Planned* | `postgresql://user:password@localhost:5432/psi_lms` |
| `JWT_SECRET` | Secret key for signing authentication tokens | *Planned* | `super-secret-key-32-chars-minimum` |
| `S3_BUCKET_NAME` | Cloud storage bucket for KYC documents | *Planned* | `psi-lms-documents` |

> [!NOTE]
> The `.env.example` file currently denotes: *No environment variables are required for this scaffold*. Database and cloud storage variables are planned for backend integration.

---

## Running the Project

| Task | Command (macOS/Linux) | Command (Windows PowerShell) |
|:---|:---|:---|
| **Development** | `npm run dev` | `npm.cmd run dev` |
| **Production Build** | `npm run build` | `npm.cmd run build` |
| **Production Start** | `npm run start` | `npm.cmd run start` |
| **Lint Check** | `npm run lint` | `npm.cmd run lint` |
| **TypeScript Check** | `npm run typecheck` | `npm.cmd run typecheck` |

---

## Screenshots

<!-- Note: To display real screenshots, place image files in public/images/ and reference them here. -->

### 1. Executive Dashboard Overview
*Summary metrics including active borrower counts, loan portfolio valuation, remaining collections, and real-time activity stream.*
```
+------------------------------------------------------------------------------------+
| [PSI ONE LMS]  Dashboard   Customers   Loans   Repayments   Reports   Settings     |
+------------------------------------------------------------------------------------+
| OVERVIEW / DASHBOARD                                                               |
| Good morning, Admin 👋                                                             |
|                                                                                    |
| [ TOTAL CUSTOMERS ]   [ ACTIVE LOANS ]   [ PORTFOLIO VALUE ]   [ OUTSTANDING DUE ] |
|        4                    3              LKR 280,000.00         LKR 293,933.00   |
|                                                                                    |
| Recent Loan Applications                                    Portfolio Activity     |
| +---------------------------------------------------------+ +--------------------+ |
| | LN-2026-001 | Kasun Perera    | LKR 150,000 | Active    | | Customer onboarded | |
| | LN-2026-002 | Nimali Fernando | LKR  80,000 | Pending   | | Payment REC-8801   | |
| | LN-2026-003 | Saman Kumara    | LKR  50,000 | Overdue   | | Loan LN-2002 audit | |
| +---------------------------------------------------------+ +--------------------+ |
+------------------------------------------------------------------------------------+
```

### 2. Loan Origination & Calculation Wizard
*3-step loan creation wizard with live computation of upfront deductions, net disbursement, and monthly installments.*
```
+------------------------------------------------------------------------------------+
| OPERATIONS / NEW LOAN CONTRACT                                                     |
| 1. Select Borrower  >>>  [2. Review Profile]  >>>  3. Loan Details                 |
+------------------------------------------------------------------------------------+
| Borrower: Kasun Madushanka Perera (CUS-001)                                        |
| Outstanding Liabilities: LKR 147,500.00                                            |
|                                                                                    |
| [ Loan Terms & Inputs ]                      [ Live Financial Summary ]            |
| Gross Principal:   [ LKR 100,000.00 ]        Gross Principal:    LKR 100,000.00    |
| Interest Rate (%): [ 3.0 % Monthly  ]        Total Deductions: - LKR   2,000.00    |
| Duration (Months): [ 12 Installments]        Net Disbursement:   LKR  98,000.00    |
| Capital Deduction: [ LKR   2,000.00 ]        Total Interest:     LKR  36,000.00    |
| First Payment Date:[ 2026-11-20     ]        Total Repayment:    LKR 136,000.00    |
|                                              Monthly Installment:LKR  11,333.33    |
|                                                                                    |
|                                              [ Confirm & Issue Loan Facility ]     |
+------------------------------------------------------------------------------------+
```

### 3. Repayments & Printable Receipt Generator
*Repayment recording interface with automatic settlement balance calculation and printable receipt output.*
```
+------------------------------------------------------------------------------------+
| REPAYMENT VOUCHER & RECEIPT                                                        |
| Receipt No: REC-2026-8801                                                          |
| Customer: Kasun Perera (CUS-001)                                                   |
| Loan Ref: LN-2026-001                                                              |
| Amount Paid: LKR 29,500.00 (Cash)                                                  |
| Allocation: Capital Repayment                                                      |
| Remaining Balance: LKR 147,500.00                                                  |
| Collector: Ajith Wickramasinghe                                                    |
|                                                                                    |
| [ 🖨️ Print Customer Receipt ]                           [ Done / Next Payment ]   |
+------------------------------------------------------------------------------------+
```

---

## Authentication Flow

### Current Implementation
- **Prototype Authentication View:** An interface is implemented at `/login` featuring branding, credential input fields, password visibility toggles, and access alerts.
- **Client-Side Simulation:** Submitting credentials navigates to the dashboard preview (`/`).
- **Role & Permission Representation:** Roles (`Admin`, `Staff`, `Customer`) and their granular rights are fully modeled in `src/types/index.ts` and managed under `/settings?tab=staff`.

```mermaid
stateDiagram-v2
    [*] --> LoginPage : Access /login
    LoginPage --> Dashboard : Submit Form (Demo Mode)
    Dashboard --> RolePermissions : Enforce UI Capabilities
    note right of RolePermissions
      - Admin: Full access
      - Staff: Assigned permission grants
      - Customer: Own account only
    end note
```

### Planned Implementation
1. **Credentials Verification:** Validate hashed passwords using `bcrypt`/`argon2` against the database.
2. **Session / JWT Handling:** Issue secure `HttpOnly` JSON Web Tokens or encrypted iron-session cookies.
3. **Route Middleware:** Next.js `middleware.ts` to inspect authentication tokens and restrict unauthorized access.
4. **Token Refresh:** Automated token rotation before expiry.

---

## Error Handling

### Client-Side Validation
- **Numeric Integrity:** Loan input forms validate positive numeric inputs for principal, interest rates, and durations, preventing zero-division errors in installment formulas.
- **Geographical Validation:** Address forms enforce standard district selection from predefined Sri Lankan regions.
- **Storage Safeguards:** State serialization to `localStorage` is wrapped in `try/catch` handlers. If local storage is corrupt or disabled, the application safely falls back to default seed data without crashing.

### Fallback & Dynamic Route Handling
- **Missing Records:** Visiting invalid customer or loan routes (`/customers/unknown-id` or `/loans/unknown-id`) renders dedicated "Customer Not Found" or "Loan Not Found" warning panels with immediate navigation back to the directory.
- **Suspense Boundaries:** Next.js dynamic query parameters (`useSearchParams`) are isolated inside React `<Suspense>` boundaries to prevent hydration mismatches during static generation.

---

## Performance Optimizations

1. **Turbopack Compiler:** Integrated with `@tailwindcss/turbopack` in `next.config.ts` for instantaneous Hot Module Replacement (HMR).
2. **Component Caching & Partial Prefetching:** Configured with `cacheComponents: true` and `partialPrefetching: true` in `next.config.ts` to optimize page transitions.
3. **Memoized Calculations:** Heavy computational tasks (such as filtering hundreds of customer records, calculating total interest, and aggregating portfolio metrics) are memoized using React `useMemo`.
4. **Optimized SVG Graphics:** Replaced heavy raster icons with lightweight SVG vectors via `lucide-react`.
5. **Print Stylesheet Isolation:** Repayment receipt printing leverages standard CSS print media rules, omitting navigation drawers and sidebars when printing receipts.

---

## Security

### Current Controls
- **Client-Side Permission Masking:** Administrative actions (such as system rules editing and staff permission toggling) are segmented by role presets.
- **Document Access Notices:** The documents module includes explicit warnings against storing sensitive identity documents in public directories.

### Planned Production Security Measures
- [ ] **Password Hashing:** Store credentials hashed with Argon2id or bcrypt (cost factor $\ge 12$).
- [ ] **Authorization Middleware:** Server-side validation of JWTs on every API endpoint.
- [ ] **Data Sanitization:** Validate all incoming API payloads using strict schema parsers (e.g., Zod).
- [ ] **SQL Injection Prevention:** Use parameterized queries via Prisma ORM or Drizzle.
- [ ] **Private Cloud Storage:** Store KYC identity scans in encrypted, private AWS S3 / Cloudflare R2 buckets with short-lived presigned URLs.
- [ ] **Rate Limiting:** Implement token bucket rate limiting on sensitive routes (e.g. login attempts) using Redis/Upstash.
- [ ] **Content Security Policy (CSP):** Enforce strict HTTP response headers including CSP, HSTS, and X-Frame-Options.

---

## Deployment

### Deploying to Vercel (Recommended)
1. Push your repository to GitHub, GitLab, or Bitbucket.
2. Import the project into the [Vercel Dashboard](https://vercel.com/new).
3. Vercel automatically detects Next.js:
   - **Framework Preset:** Next.js
   - **Build Command:** `next build`
   - **Output Directory:** `.next`
4. Click **Deploy**.

### Self-Hosted Docker Deployment
*(Dockerfile template for production containerization)*

```dockerfile
# 1. Base image
FROM node:20-alpine AS base

# 2. Dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# 3. Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# 4. Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

---

## Future Improvements

- [ ] **Persistent Database Layer:** Integrate PostgreSQL using Prisma ORM or Drizzle in `src/lib/db/`.
- [ ] **Backend Route Handlers:** Implement full CRUD API routes in `src/app/api/` for customers, loans, repayments, and staff.
- [ ] **Secure Authentication:** Implement NextAuth.js / Auth.js with JWT session management and password reset flows.
- [ ] **Complete Loan Amortization Schedule:** Build out `/loans/[loanId]/schedule` to render full payment schedule breakdowns (principal vs. interest per installment).
- [ ] **Dedicated Overdue Management:** Implement automated delinquency buckets (1-30 days, 31-60 days, 90+ days) and SMS payment reminders under `/overdue`.
- [ ] **Encrypted KYC Storage:** Direct integration with AWS S3 or Cloudflare R2 for customer ID and document uploads.
- [ ] **Automated Testing Suite:** Configure Vitest for financial formula unit tests and Playwright for end-to-end loan issuance testing.

---

## Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch:**
   ```bash
   git checkout -b feature/loan-amortization-schedule
   ```
3. **Commit your changes:**
   ```bash
   git commit -m "feat: implement loan amortization schedule table"
   ```
4. **Push to the branch:**
   ```bash
   git push origin feature/loan-amortization-schedule
   ```
5. **Open a Pull Request** describing your changes and testing steps.

---

## License

This project is proprietary software developed by **Perfect Solution International**. All rights reserved. Refer to repository terms for internal licensing details.

---

## Author

**Perfect Solution International**  
- **Organization:** [Perfect Solution International](https://github.com/Perfect-Solution-International)  
- **Repository:** [Loan-management-system](https://github.com/Perfect-Solution-International/Loan-management-system)  
- **Contact:** `support@psione.lk`  
- **Location:** Sri Lanka

### Folder Explanations
- **`src/app/`**: Next.js App Router containing route segments and page components. Organized into route groups `(auth)` for public authentication views and `(dashboard)` for core administrative modules.
- **`src/components/`**: Modular, reusable UI components including forms, navigation sidebars, and modals.
- **`src/lib/`**: Contains core mathematical formulas (`loan-calculator.ts`), pre-seeded demo records (`demo-data.ts`), and architectural scaffolds for database and auth clients.
- **`src/providers/`**: Holds `DataProvider`, the React Context provider that orchestrates state transitions and synchronizes all changes with the browser's `localStorage`.
- **`src/types/`**: Strict TypeScript interfaces and types for all entities, form schemas, and financial calculations.
- **`src/constants/`**: Formatting helpers, including `MONEY()`, which formats numeric values into Sri Lankan Rupee currency strings (`LKR`).

---

## Database & Data Models

### Storage Strategy
The current application uses a **Client-Side Reactive Cache** backed by browser `localStorage`:
- `psi_customers`: Serialized array of `Customer` entities.
- `psi_loans`: Serialized array of `Loan` entities.
- `psi_payments`: Serialized array of `Payment` transaction entities.
- `psi_documents`: Serialized array of uploaded `CustomerDocument` entities.
- `psi_settings`: Serialized `SystemSettings` object.
- `psi_staff_users`: Serialized array of `StaffUser` administrative profiles.

> [!NOTE]
> Persistent server-side database connectivity (e.g. PostgreSQL with Prisma ORM) is scaffolded in `src/lib/db/` but is **Not implemented** in the active build.

### Core Entity Schema

#### Customer
| Field | Type | Description |
|:---|:---|:---|
| `id` | `string` | Unique identifier (e.g., `CUS-001`) |
| `name` / `fullName` | `string` | Customer primary & full legal name |
| `nic` | `string` | Sri Lankan National Identity Card Number |
| `phone` / `alternatePhone` | `string` | Primary and backup telephone numbers |
| `email` | `string` (optional) | Customer email address |
| `dob` | `string` (optional) | Date of birth (`YYYY-MM-DD`) |
| `gender` | `string` (optional) | Gender identifier |
| `address`, `village`, `town`, `district` | `string` | Complete residential geographic address |
| `monthlyIncome` | `number` | Monthly earned income in LKR |
| `status` | `CustomerStatus` | `Active`, `Inactive`, or `Suspended` |
| `photoUrl` | `string` (optional) | Borrower portrait image URL |
| `nicFrontUrl`, `nicBackUrl` | `string` (optional) | URLs/Base64 of NIC cards |
| `guarantorName`, `guarantorNic`, `guarantorPhone` | `string` (optional) | Guarantor profile information |

#### Loan
| Field | Type | Description |
|:---|:---|:---|
| `id` / `loanNo` | `string` | Unique loan code (e.g., `LN-2026-001`) |
| `customerId` | `string` | Foreign key referencing `Customer.id` |
| `principal` / `amount` | `number` | Gross loan amount borrowed in LKR |
| `capitalDeduction` | `number` | Upfront capital deduction retained |
| `interestDeduction` | `number` | Upfront interest deduction retained |
| `otherFees` | `number` | Administrative and processing fees |
| `interestRate` | `number` | Interest rate percentage |
| `ratePeriod` | `string` | `Daily`, `Weekly`, or `Monthly` |
| `repaymentFrequency` | `string` | `Daily`, `Weekly`, or `Monthly` |
| `duration` | `number` | Duration in total installment counts |
| `issueDate` | `string` | Date of loan agreement (`YYYY-MM-DD`) |
| `firstPaymentDate` | `string` | Date first repayment is due |
| `status` | `LoanStatus` | `Active`, `Pending`, `Completed`, `Overdue`, `Rejected` |
| `interest` | `number` | Calculated total interest payable |
| `totalRepayment` | `number` | Total repayable amount ($\text{Principal} + \text{Interest}$) |
| `netDisbursement` | `number` | Actual cash handed to borrower |
| `installment` | `number` | Regular repayment installment amount |

#### Payment
| Field | Type | Description |
|:---|:---|:---|
| `id` | `string` | Unique transaction ID (e.g., `PAY-001`) |
| `loanId` | `string` | Foreign key referencing `Loan.id` |
| `customerId` | `string` | Foreign key referencing `Customer.id` |
| `amount` | `number` | Amount paid in LKR |
| `date` | `string` | Payment date (`YYYY-MM-DD`) |
| `type` | `string` | `Capital`, `Interest`, or `Other` |
| `method` | `string` | `Cash`, `Bank Transfer`, or `Cheque` |
| `receiptNo` | `string` | Formal receipt reference (e.g., `REC-2026-8801`) |
| `collectedBy` | `string` | Name of collecting officer |

### Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    CUSTOMER ||--o{ LOAN : borrows
    CUSTOMER ||--o{ CUSTOMER_DOCUMENT : owns
    CUSTOMER ||--o{ PAYMENT : pays
    LOAN ||--o{ PAYMENT : collects
    STAFF_USER ||--o{ PAYMENT : records

    CUSTOMER {
        string id PK
        string fullName
        string nic UK
        string phone
        string address
        string town
        string district
        float monthlyIncome
        string status
    }

    LOAN {
        string id PK
        string customerId FK
        string loanNo UK
        float principal
        float capitalDeduction
        float interestDeduction
        float interestRate
        string repaymentFrequency
        int duration
        float totalRepayment
        float netDisbursement
        float installment
        string status
    }

    PAYMENT {
        string id PK
        string loanId FK
        string customerId FK
        float amount
        string date
        string type
        string method
        string receiptNo UK
        string collectedBy
    }

    CUSTOMER_DOCUMENT {
        string id PK
        string customerId FK
        string title
        string type
        string fileName
        string fileSize
        string fileUrl
    }

    STAFF_USER {
        string id PK
        string name
        string email UK
        string role
        string branch
        string status
    }
```

---

## API Documentation

> [!IMPORTANT]
> The backend REST API endpoints under `src/app/api/` are **Not implemented** (currently scaffolded with `.gitkeep`). The application presently executes all operations on the client side via the `DataProvider` context.
>
> The table below outlines the planned REST API specification designed to interface with the current frontend data contracts.

| Method | Endpoint | Description | Authentication | Status |
|:---|:---|:---|:---|:---|
| `POST` | `/api/auth/login` | Authenticate staff credentials & issue session/JWT | Public | *Not implemented* |
| `POST` | `/api/auth/logout` | Revoke active staff token | Bearer Token | *Not implemented* |
| `GET` | `/api/customers` | Retrieve paginated borrower directory | Bearer Token | *Not implemented* |
| `POST` | `/api/customers` | Register a new customer with KYC data | Bearer Token | *Not implemented* |
| `GET` | `/api/customers/:id` | Fetch full customer profile with linked loans | Bearer Token | *Not implemented* |
| `PUT` | `/api/customers/:id` | Update borrower details | Bearer Token | *Not implemented* |
| `GET` | `/api/loans` | List loans with status and customer filters | Bearer Token | *Not implemented* |
| `POST` | `/api/loans` | Disburse/create a new loan agreement | Bearer Token | *Not implemented* |
| `GET` | `/api/loans/:id` | Retrieve single loan breakdown and payments | Bearer Token | *Not implemented* |
| `POST` | `/api/payments` | Record a repayment and generate receipt | Bearer Token | *Not implemented* |
| `POST` | `/api/documents/upload` | Securely upload KYC documents to storage | Bearer Token | *Not implemented* |
| `GET` | `/api/settings` | Fetch global interest rules and fees | Bearer Token | *Not implemented* |
| `PUT` | `/api/settings` | Update system lending rules | Admin | *Not implemented* |
| `GET` | `/api/staff` | List staff users and permissions | Admin | *Not implemented* |

---

## Environment Variables

| Variable | Description | Required | Default / Example |
|:---|:---|:---|:---|
| `NODE_ENV` | Runtime environment mode | No | `development` |
| `PORT` | Local server port | No | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | *Planned* | `postgresql://user:password@localhost:5432/psi_lms` |
| `JWT_SECRET` | Secret key for signing authentication tokens | *Planned* | `super-secret-key-32-chars-minimum` |
| `S3_BUCKET_NAME` | Cloud storage bucket for KYC documents | *Planned* | `psi-lms-documents` |

> [!NOTE]
> The `.env.example` file currently denotes: *No environment variables are required for this scaffold*. Database and cloud storage variables are planned for backend integration.

---


## Screenshots

<!-- Note: To display real screenshots, place image files in public/images/ and reference them here. -->

### 1. Executive Dashboard Overview
*Summary metrics including active borrower counts, loan portfolio valuation, remaining collections, and real-time activity stream.*
```
+------------------------------------------------------------------------------------+
| [PSI ONE LMS]  Dashboard   Customers   Loans   Repayments   Reports   Settings     |
+------------------------------------------------------------------------------------+
| OVERVIEW / DASHBOARD                                                               |
| Good morning, Admin 👋                                                             |
|                                                                                    |
| [ TOTAL CUSTOMERS ]   [ ACTIVE LOANS ]   [ PORTFOLIO VALUE ]   [ OUTSTANDING DUE ] |
|        4                    3              LKR 280,000.00         LKR 293,933.00   |
|                                                                                    |
| Recent Loan Applications                                    Portfolio Activity     |
| +---------------------------------------------------------+ +--------------------+ |
| | LN-2026-001 | Kasun Perera    | LKR 150,000 | Active    | | Customer onboarded | |
| | LN-2026-002 | Nimali Fernando | LKR  80,000 | Pending   | | Payment REC-8801   | |
| | LN-2026-003 | Saman Kumara    | LKR  50,000 | Overdue   | | Loan LN-2002 audit | |
| +---------------------------------------------------------+ +--------------------+ |
+------------------------------------------------------------------------------------+
```

### 2. Loan Origination & Calculation Wizard
*3-step loan creation wizard with live computation of upfront deductions, net disbursement, and monthly installments.*
```
+------------------------------------------------------------------------------------+
| OPERATIONS / NEW LOAN CONTRACT                                                     |
| 1. Select Borrower  >>>  [2. Review Profile]  >>>  3. Loan Details                 |
+------------------------------------------------------------------------------------+
| Borrower: Kasun Madushanka Perera (CUS-001)                                        |
| Outstanding Liabilities: LKR 147,500.00                                            |
|                                                                                    |
| [ Loan Terms & Inputs ]                      [ Live Financial Summary ]            |
| Gross Principal:   [ LKR 100,000.00 ]        Gross Principal:    LKR 100,000.00    |
| Interest Rate (%): [ 3.0 % Monthly  ]        Total Deductions: - LKR   2,000.00    |
| Duration (Months): [ 12 Installments]        Net Disbursement:   LKR  98,000.00    |
| Capital Deduction: [ LKR   2,000.00 ]        Total Interest:     LKR  36,000.00    |
| First Payment Date:[ 2026-11-20     ]        Total Repayment:    LKR 136,000.00    |
|                                              Monthly Installment:LKR  11,333.33    |
|                                                                                    |
|                                              [ Confirm & Issue Loan Facility ]     |
+------------------------------------------------------------------------------------+
```

### 3. Repayments & Printable Receipt Generator
*Repayment recording interface with automatic settlement balance calculation and printable receipt output.*
```
+------------------------------------------------------------------------------------+
| REPAYMENT VOUCHER & RECEIPT                                                        |
| Receipt No: REC-2026-8801                                                          |
| Customer: Kasun Perera (CUS-001)                                                   |
| Loan Ref: LN-2026-001                                                              |
| Amount Paid: LKR 29,500.00 (Cash)                                                  |
| Allocation: Capital Repayment                                                      |
| Remaining Balance: LKR 147,500.00                                                  |
| Collector: Ajith Wickramasinghe                                                    |
|                                                                                    |
| [ 🖨️ Print Customer Receipt ]                           [ Done / Next Payment ]   |
+------------------------------------------------------------------------------------+
```

---
