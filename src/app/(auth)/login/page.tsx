"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Fingerprint,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { useData } from "@/providers/data-provider";

export default function LoginPage() {
  const router = useRouter();
  const { customers } = useData();

  // Tab: 'staff' | 'borrower'
  const [loginRole, setLoginRole] = useState<"staff" | "borrower">("staff");

  // Staff credentials state
  const [showPassword, setShowPassword] = useState(false);
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");

  // Borrower credentials state
  const [borrowerIdentifier, setBorrowerIdentifier] = useState("");
  const [borrowerPin, setBorrowerPin] = useState("");
  const [borrowerError, setBorrowerError] = useState("");

  // Handle staff login
  const handleStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/dashboard");
  };

  // Handle borrower login
  const handleBorrowerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBorrowerError("");

    const term = borrowerIdentifier.trim().toLowerCase();
    if (!term) {
      setBorrowerError("Please enter your NIC or Customer ID.");
      return;
    }

    // Match customer by ID, NIC, or phone
    const matched = customers.find(
      (c) =>
        c.id.toLowerCase() === term ||
        c.nic.toLowerCase() === term ||
        c.phone.replace(/[^0-9]/g, "") === term.replace(/[^0-9]/g, "")
    );

    if (matched) {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("customerSessionId", matched.id);
      }
      router.push(`/customerdashboard?customerId=${matched.id}`);
    } else {
      // Fallback demo match or error
      if (customers.length > 0) {
        setBorrowerError(
          `Customer '${borrowerIdentifier}' not found. You can try demo account: ${customers[0].nic} (${customers[0].id})`
        );
      } else {
        setBorrowerError("Customer record not found. Please contact your loan officer.");
      }
    }
  };

  const handleSelectDemoCustomer = (cId: string, cNic: string) => {
    setBorrowerIdentifier(cNic);
    setBorrowerPin("1234");
    setBorrowerError("");
  };

  return (
    <main className="login-page">
      {/* Left side - Branding */}
      <section className="login-visual">
        <div className="login-visual-glow login-glow-one" />
        <div className="login-visual-glow login-glow-two" />

        <div className="login-brand mb-4">
          <BrandLogo href="/" size="lg" theme="dark" />
        </div>

        <div className="login-visual-content">
          <span className="login-kicker">
            <Sparkles size={14} />
            SMARTER FINANCIAL MANAGEMENT
          </span>

          <h1>
            Every loan.
            <br />
            <span>One clear view.</span>
          </h1>

          <p>
            {loginRole === "staff"
              ? "Manage customers, track repayments, and make confident lending decisions — all from one secure workspace."
              : "Access your active loan facilities, check upcoming installment due dates, view payment receipts, and download statements securely."}
          </p>

          <div className="login-feature-list">
            <div>
              <span><ShieldCheck size={18} /></span>
              <section>
                <strong>Secure by design</strong>
                <small>
                  End-to-end 256-bit encrypted access for staff and borrowers.
                </small>
              </section>
            </div>

            <div>
              <span><Fingerprint size={18} /></span>
              <section>
                <strong>{loginRole === "staff" ? "Staff Loan Portfolio" : "Self-Service Borrower Portal"}</strong>
                <small>
                  {loginRole === "staff"
                    ? "Full administrative control, daily collections, and loan approval workflows."
                    : "Check live outstanding balances, installment schedules, and official receipts."}
                </small>
              </section>
            </div>
          </div>
        </div>

        <div className="login-visual-footer">
          <span className="login-footer-dot" />
          Built for clarity. Designed for control.
        </div>

        <div className="login-orbit orbit-one" />
        <div className="login-orbit orbit-two" />
      </section>

      {/* Right side - Login form */}
      <section className="login-form-side">
        <div className="login-form-wrap">
          <div className="login-mobile-brand mb-6">
            <BrandLogo href="/" size="md" theme="light" />
          </div>

          {/* Role Switcher Tabs */}
          <div className="mb-6 p-1.5 bg-slate-100 rounded-2xl border border-slate-200 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => {
                setLoginRole("staff");
                setBorrowerError("");
              }}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                loginRole === "staff"
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200/80"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Users size={16} className={loginRole === "staff" ? "text-red-600" : "text-slate-400"} />
              Staff / Admin
            </button>

            <button
              type="button"
              onClick={() => {
                setLoginRole("borrower");
                setBorrowerError("");
              }}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                loginRole === "borrower"
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200/80"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <User size={16} className={loginRole === "borrower" ? "text-emerald-600" : "text-slate-400"} />
              Borrower Portal
            </button>
          </div>

          <div className="login-welcome-icon">
            <LockKeyhole size={22} />
          </div>

          <p className="login-eyebrow">
            {loginRole === "staff" ? "INTERNAL WORKSPACE" : "CUSTOMER SELF-SERVICE"}
          </p>

          <h2>
            {loginRole === "staff" ? "Sign in to your account" : "Sign in to Borrower Portal"}
          </h2>

          <p className="login-intro">
            {loginRole === "staff"
              ? "Enter your company email and password to access the operational system."
              : "Enter your National Identity Card (NIC) or Customer ID to review your loan information."}
          </p>

          {/* Staff Login Form */}
          {loginRole === "staff" && (
            <form onSubmit={handleStaffSubmit} className="login-form">
              <label htmlFor="login-email">Staff Email address</label>

              <div className="login-input-wrap">
                <Mail size={18} />
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  placeholder="admin@psione.lk"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>

              <div className="login-password-heading">
                <label htmlFor="login-password">Password</label>
                <button
                  type="button"
                  className="login-text-button"
                  onClick={() =>
                    alert("Staff password reset request logged with System Administrator.")
                  }
                >
                  Forgot password?
                </button>
              </div>

              <div className="login-input-wrap">
                <LockKeyhole size={18} />
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="login-eye-button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <label className="login-remember">
                <input type="checkbox" name="remember" />
                <span>Remember me on this workstation</span>
              </label>

              <button type="submit" className="login-submit cursor-pointer">
                Login to Dashboard
                <ArrowRight size={18} />
              </button>
            </form>
          )}

          {/* Borrower / Customer Login Form */}
          {loginRole === "borrower" && (
            <form onSubmit={handleBorrowerSubmit} className="login-form">
              {borrowerError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 mb-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
                  <p>{borrowerError}</p>
                </div>
              )}

              <label htmlFor="borrower-id">NIC Number or Customer ID</label>
              <div className="login-input-wrap">
                <User size={18} />
                <input
                  id="borrower-id"
                  name="borrowerId"
                  type="text"
                  placeholder="e.g. 199125601234 or CUS-001"
                  value={borrowerIdentifier}
                  onChange={(e) => {
                    setBorrowerIdentifier(e.target.value);
                    setBorrowerError("");
                  }}
                  autoComplete="username"
                  required
                />
              </div>

              <div className="login-password-heading">
                <label htmlFor="borrower-pin">Access PIN / Password</label>
                <span className="text-[11px] text-slate-400">Default: any PIN / 1234</span>
              </div>

              <div className="login-input-wrap">
                <LockKeyhole size={18} />
                <input
                  id="borrower-pin"
                  name="pin"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter 4-digit PIN or password"
                  value={borrowerPin}
                  onChange={(e) => setBorrowerPin(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="login-eye-button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Quick Demo Borrower Selector Chips */}
              <div className="pt-1">
                <p className="text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                  Quick Demo Accounts:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {customers.slice(0, 3).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectDemoCustomer(c.id, c.nic)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-slate-200 text-slate-700 transition cursor-pointer"
                    >
                      {c.name.split(" ")[0]} ({c.id})
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" className="login-submit cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700">
                Log In to Borrower Portal
                <ArrowRight size={18} />
              </button>
            </form>
          )}

          <div className="login-security-note">
            <ShieldCheck size={17} />
            <span>
              {loginRole === "staff"
                ? "Access is restricted to authorized company personnel."
                : "Customer self-service portal is protected with end-to-end encryption."}
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Need to register a customer?</span>
            <Link href="/register" className="font-semibold text-red-600 hover:text-red-800 transition">
              Customer Registration →
            </Link>
          </div>

          <Link href="/" className="login-back-link text-slate-500 mt-3 hover:text-slate-800 transition">
            ← Return to main homepage
          </Link>
        </div>

        <footer className="login-copyright">
          © 2026 PSI ONE. All rights reserved.
        </footer>
      </section>
    </main>
  );
}
