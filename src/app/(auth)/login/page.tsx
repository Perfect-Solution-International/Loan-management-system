"use client";

import Image from "next/image";
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
  AlertCircle,
  Shield,
  Briefcase,
  User,
  KeyRound,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { api, ApiError, saveSession, clearSession } from "@/lib/api-client";

export default function LoginPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  // Unified login credentials state
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedPortal, setSelectedPortal] = useState<
    "admin" | "staff" | "customer"
  >("admin");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMsg("");
    setSubmitting(true);
    try {
      const authenticateStaff = async () => {
        const result = await api.login(identifier.trim(), password);
        if (result.user.role !== "Admin" && result.user.role !== "Staff") {
          throw new Error("This account does not have a supported staff role.");
        }
        return { token: result.token, role: result.user.role, id: result.user.id };
      };
      const authenticateCustomer = async () => {
        const result = await api.customerLogin(identifier.trim(), password);
        return { token: result.token, role: "Customer" as const, id: result.customer.id };
      };
      // Accounts are authenticated by separate backend endpoints. The selected
      // portal only chooses which to try first; authentication decides the role.
      const attempts = selectedPortal === "customer"
        ? [authenticateCustomer, authenticateStaff]
        : [authenticateStaff, authenticateCustomer];
      let account;
      try {
        account = await attempts[0]();
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) throw error;
        try {
          account = await attempts[1]();
        } catch (fallbackError) {
          if (fallbackError instanceof ApiError && fallbackError.status === 401) {
            throw new Error("Invalid email or password");
          }
          throw fallbackError;
        }
      }
      const destinations = {
        Admin: "/dashboard",
        Staff: "/field",
        Customer: "/customerdashboard",
      };
      saveSession(account.token, account.role === "Customer" ? "customer" : "staff");
      if (account.role === "Customer") sessionStorage.setItem("customerSessionId", account.id);
      router.replace(destinations[account.role]);
    } catch (error) {
      clearSession();
      setErrorMsg(error instanceof Error ? error.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page login-page-fixed">
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
            Manage customers, track repayments, review loan statements, and make
            confident lending decisions — all from one centralized workspace.
          </p>

          <div className="login-feature-list">
            <div>
              <span>
                <ShieldCheck size={18} />
              </span>
              <section>
                <strong>Organized for daily lending</strong>
                <small>
                  Access your customer accounts, loan records, and daily lending
                  tools in one place.
                </small>
              </section>
            </div>

            <div>
              <span>
                <Fingerprint size={18} />
              </span>
              <section>
                <strong>One workspace</strong>
                <small>
                  Single point of access for portfolio management, daily
                  collections, and customer accounts.
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

      {/* Right side - Centralized Login form */}
      <section className="login-form-side">
        <div className="login-form-wrap">
          <div className="login-mobile-brand mb-6">
            <BrandLogo href="/" size="md" theme="light" />
          </div>

          <div className="login-welcome-icon">
            <LockKeyhole size={22} />
          </div>

          <p className="login-eyebrow">SECURE ACCESS</p>

          <h2>Sign in to your account</h2>

          <p className="login-intro">
            Enter your email, username, or Customer ID / NIC along with your
            password.
          </p>

          {/* Professional Role / Portal Switcher */}
          <div className="login-portal-switcher mb-5 bg-slate-50/80 p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Choose a portal · Quick-fill credentials
              </span>
              <span className="text-[11px] font-bold text-red-600 flex items-center gap-1">
                <KeyRound size={11} /> Portal access
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedPortal("admin");
                  setIdentifier("");
                  setPassword("");
                  setErrorMsg("");
                }}
                className={`p-2.5 rounded-xl text-left transition cursor-pointer border flex flex-col items-start ${
                  selectedPortal === "admin"
                    ? "bg-red-50 border-red-300 ring-2 ring-red-500/20 text-red-950"
                    : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs">
                  <Shield size={13} className="text-red-600" />
                  <span>Admin</span>
                </div>
                <span className="text-[11px] font-mono font-bold text-red-600 mt-1">
                  Staff account
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedPortal("staff");
                  setIdentifier("");
                  setPassword("");
                  setErrorMsg("");
                }}
                className={`p-2.5 rounded-xl text-left transition cursor-pointer border flex flex-col items-start ${
                  selectedPortal === "staff"
                    ? "bg-red-50 border-red-300 ring-2 ring-red-500/20 text-red-950"
                    : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs">
                  <Briefcase size={13} className="text-red-600" />
                  <span>Staff / Field</span>
                </div>
                <span className="text-[11px] font-mono font-bold text-red-600 mt-1">
                  Staff account
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedPortal("customer");
                  setIdentifier("");
                  setPassword("");
                  setErrorMsg("");
                }}
                className={`p-2.5 rounded-xl text-left transition cursor-pointer border flex flex-col items-start ${
                  selectedPortal === "customer"
                    ? "bg-red-50 border-red-300 ring-2 ring-red-500/20 text-red-950"
                    : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs">
                  <User size={13} className="text-red-600" />
                  <span>Customer</span>
                </div>
                <span className="text-[11px] font-mono font-bold text-red-600 mt-1">
                  Customer account
                </span>
              </button>
            </div>
          </div>

          {errorMsg && (
            <div
              className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 mb-4 leading-relaxed font-medium"
              role="alert"
            >
              <AlertCircle
                size={16}
                className="shrink-0 mt-0.5 text-rose-600"
              />
              <p>{errorMsg}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <label htmlFor="login-identifier">
              {selectedPortal === "customer"
                ? "Customer ID, NIC, or Registered Email"
                : selectedPortal === "staff"
                  ? "Staff Work Email or Staff ID"
                  : "Admin Email or Username"}
            </label>
            <div className="login-input-wrap">
              <Mail size={18} />
              <input
                id="login-identifier"
                name="identifier"
                type="text"
                placeholder={
                  selectedPortal === "customer"
                    ? "e.g. CUS-001 or National Identity Card (NIC)"
                    : selectedPortal === "staff"
                      ? "e.g. officer@psione.lk or STF-02"
                      : "admin@psione.lk"
                }
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  setErrorMsg("");
                }}
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
                  alert(
                    "Password reset request logged. Please contact your System Admin.",
                  )
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
                placeholder={
                  selectedPortal === "customer"
                    ? "Enter customer password"
                    : selectedPortal === "staff"
                      ? "Enter staff password"
                      : "Enter admin password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

            <button
              type="submit"
              disabled={submitting}
              className="login-submit cursor-pointer"
            >
              Sign in
              <ArrowRight size={18} />
            </button>
          </form>

          <div className="login-security-note">
            <ShieldCheck size={17} />
            <span>
              Access is restricted to authorized company personnel and verified
              accounts.
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
