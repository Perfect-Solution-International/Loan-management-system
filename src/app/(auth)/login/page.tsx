"use client";

import Link from "next/link";
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
import { useData } from "@/providers/data-provider";

export default function LoginPage() {
  const router = useRouter();
  const { customers, staffUsers } = useData();

  // Unified login credentials state
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedPortal, setSelectedPortal] = useState<"admin" | "staff" | "customer">("admin");

  // Centralized login submission handler with strict role-based routing & password verification
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const term = identifier.trim().toLowerCase();
    const enteredPass = password.trim();

    if (!term) {
      setErrorMsg("Please enter your email, username, Customer ID, or NIC.");
      return;
    }
    if (!enteredPass) {
      setErrorMsg("Please enter your password.");
      return;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Check Administrator Account (STRICT: only admin123 / admin password)
    // ─────────────────────────────────────────────────────────────────────────
    const adminUser = staffUsers.find(
      (s) =>
        s.role === "Administrator" &&
        (s.email.toLowerCase() === term ||
          s.id.toLowerCase() === term ||
          s.name.toLowerCase() === term)
    );
    const isAdminIdentifier =
      adminUser ||
      term === "admin@psione.lk" ||
      term === "admin" ||
      term === "superadmin" ||
      term === "stf-01";

    if (isAdminIdentifier) {
      const expectedAdminPass = adminUser?.password || "admin123";
      if (enteredPass !== expectedAdminPass) {
        if (enteredPass === "Staff@123" || enteredPass === "User@123") {
          setErrorMsg(
            "Access Denied: This is an Administrator account. Staff@123 or User@123 cannot be used. Please enter the Administrator password."
          );
        } else {
          setErrorMsg("Invalid Administrator password. Please verify your credentials.");
        }
        return;
      }

      // Valid Administrator credentials
      if (typeof window !== "undefined") {
        localStorage.setItem("psi_active_staff_id", adminUser?.id || "STF-01");
        localStorage.setItem("psi_user_role", "Administrator");
        localStorage.setItem("psi_logged_staff_name", "System Administrator");
      }
      router.push("/dashboard");
      return;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Check Staff User (STRICT: only Staff@123 / staff password)
    // ─────────────────────────────────────────────────────────────────────────
    const matchedStaff = staffUsers.find(
      (s) =>
        s.role !== "Administrator" &&
        (s.email.toLowerCase() === term ||
          s.id.toLowerCase() === term ||
          s.name.toLowerCase() === term)
    );
    const isStaffIdentifier =
      matchedStaff ||
      term.includes("officer") ||
      term.includes("agent") ||
      term.includes("field") ||
      term.startsWith("stf-") ||
      term === "staff@psione.lk";

    if (isStaffIdentifier) {
      const expectedStaffPass = matchedStaff?.password || "Staff@123";
      if (enteredPass !== expectedStaffPass) {
        if (enteredPass === "admin123") {
          setErrorMsg(
            "Access Denied: This is a Staff account. The Administrator password cannot be used. Please enter the Staff password (Staff@123)."
          );
        } else if (enteredPass === "User@123") {
          setErrorMsg(
            "Access Denied: This is a Staff account. Customer password User@123 cannot be used. Please enter the Staff password (Staff@123)."
          );
        } else {
          setErrorMsg("Invalid Staff password. Please use your assigned staff password (Staff@123).");
        }
        return;
      }

      // Valid Staff credentials
      if (typeof window !== "undefined") {
        const staffId = matchedStaff?.id || "STF-02";
        const staffName = matchedStaff?.name || (term.includes("@") ? "Staff Officer" : term);
        localStorage.setItem("psi_active_staff_id", staffId);
        localStorage.setItem("psi_logged_staff_name", staffName);
        localStorage.setItem("psi_user_role", "Staff");
      }

      // If Field Officer or Collection Agent -> route directly to /field app!
      if (
        matchedStaff?.role === "Loan Officer" ||
        matchedStaff?.role === "Collection Agent" ||
        term.includes("field") ||
        term.includes("officer") ||
        term.includes("agent")
      ) {
        router.push("/field");
        return;
      }

      // Other staff / auditor -> operations dashboard
      router.push("/dashboard");
      return;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Check Customer Account (STRICT: only User@123 / customer password)
    // ─────────────────────────────────────────────────────────────────────────
    const matchedCustomer = customers.find(
      (c) =>
        c.id.toLowerCase() === term ||
        c.nic.toLowerCase() === term ||
        (c.email && c.email.toLowerCase() === term) ||
        (c.phone && c.phone.replace(/[^0-9]/g, "") === term.replace(/[^0-9]/g, "")) ||
        c.name.toLowerCase() === term
    );
    const isCustomerIdentifier =
      matchedCustomer ||
      term.startsWith("cus-") ||
      /^\d{9}[vVxX]$/.test(term) ||
      /^\d{12}$/.test(term) ||
      term.includes("customer") ||
      term === "user@psione.lk";

    if (isCustomerIdentifier) {
      const expectedCustomerPass = matchedCustomer?.password || "User@123";
      if (enteredPass !== expectedCustomerPass) {
        if (enteredPass === "admin123") {
          setErrorMsg(
            "Access Denied: This is a Customer account. Administrator password cannot be used. Please enter the Customer password (User@123)."
          );
        } else if (enteredPass === "Staff@123") {
          setErrorMsg(
            "Access Denied: This is a Customer account. Staff password cannot be used. Please enter the Customer password (User@123)."
          );
        } else {
          setErrorMsg("Invalid Customer password. Please use your customer password (User@123).");
        }
        return;
      }

      // Valid Customer credentials
      const customerId = matchedCustomer?.id || term.toUpperCase();
      if (typeof window !== "undefined") {
        sessionStorage.setItem("customerSessionId", customerId);
      }
      router.push(`/customerdashboard?customerId=${customerId}`);
      return;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Fallback for unrecognized identifiers with role passwords
    // ─────────────────────────────────────────────────────────────────────────
    if (enteredPass === "admin123") {
      setErrorMsg("No Administrator account found for this identifier. Please verify your admin username/email.");
      return;
    }
    if (enteredPass === "Staff@123") {
      setErrorMsg("No Staff account found for this identifier. Please verify your staff ID or registered work email.");
      return;
    }
    if (enteredPass === "User@123") {
      setErrorMsg("No Customer record found for this identifier. Please verify your Customer ID, NIC, or phone number.");
      return;
    }

    setErrorMsg("Invalid login credentials. Please check your username/email and password.");
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
            Manage customers, track repayments, review loan statements, and make confident lending decisions — all from one centralized workspace.
          </p>

          <div className="login-feature-list">
            <div>
              <span><ShieldCheck size={18} /></span>
              <section>
                <strong>Organized for daily lending</strong>
                <small>
                  End-to-end 256-bit encrypted access for authorized personnel and customers.
                </small>
              </section>
            </div>

            <div>
              <span><Fingerprint size={18} /></span>
              <section>
                <strong>Centralized Portal</strong>
                <small>
                  Single point of access for portfolio management, daily collections, and customer accounts.
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

          <p className="login-eyebrow">
            SECURE ACCESS
          </p>

          <h2>
            Sign in to your account
          </h2>

          <p className="login-intro">
            Enter your email, username, or Customer ID / NIC along with your password.
          </p>

          {/* Professional Role / Portal Switcher */}
          <div className="mb-5 bg-slate-50/80 p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Select Portal / Quick Fill Credentials
              </span>
              <span className="text-[10px] font-bold text-red-600 flex items-center gap-1">
                <KeyRound size={11} /> Role Enforced
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedPortal("admin");
                  setIdentifier("admin@psione.lk");
                  setPassword("admin123");
                  setErrorMsg("");
                }}
                className={`p-2.5 rounded-xl text-left transition cursor-pointer border flex flex-col items-start ${
                  selectedPortal === "admin"
                    ? "bg-red-50 border-red-300 ring-2 ring-red-500/20 text-red-950"
                    : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
                }`}
              >
                <div className="flex items-center gap-1.5 font-black text-xs">
                  <Shield size={13} className="text-red-600" />
                  <span>Admin</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-red-600 mt-1">
                  admin123
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedPortal("staff");
                  const activeStaff = staffUsers.find((s) => s.role !== "Administrator");
                  setIdentifier(activeStaff?.email || activeStaff?.id || "officer@psione.lk");
                  setPassword("Staff@123");
                  setErrorMsg("");
                }}
                className={`p-2.5 rounded-xl text-left transition cursor-pointer border flex flex-col items-start ${
                  selectedPortal === "staff"
                    ? "bg-red-50 border-red-300 ring-2 ring-red-500/20 text-red-950"
                    : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
                }`}
              >
                <div className="flex items-center gap-1.5 font-black text-xs">
                  <Briefcase size={13} className="text-red-600" />
                  <span>Staff / Field</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-red-600 mt-1">
                  Staff@123
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedPortal("customer");
                  const activeCustomer = customers[0];
                  setIdentifier(activeCustomer?.id || activeCustomer?.nic || "CUS-001");
                  setPassword("User@123");
                  setErrorMsg("");
                }}
                className={`p-2.5 rounded-xl text-left transition cursor-pointer border flex flex-col items-start ${
                  selectedPortal === "customer"
                    ? "bg-red-50 border-red-300 ring-2 ring-red-500/20 text-red-950"
                    : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
                }`}
              >
                <div className="flex items-center gap-1.5 font-black text-xs">
                  <User size={13} className="text-red-600" />
                  <span>Customer</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-red-600 mt-1">
                  User@123
                </span>
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 mb-4 leading-relaxed font-medium">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
              <p>{errorMsg}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <label htmlFor="login-identifier">
              {selectedPortal === "customer"
                ? "Customer ID, NIC, or Registered Email"
                : selectedPortal === "staff"
                ? "Staff Work Email or Staff ID"
                : "Administrator Email or Username"}
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
                  alert("Password reset request logged. Please contact your System Administrator.")
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
                    ? "Enter customer password (User@123)"
                    : selectedPortal === "staff"
                    ? "Enter staff password (Staff@123)"
                    : "Enter admin password (admin123)"
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

            <button type="submit" className="login-submit cursor-pointer">
              Login
              <ArrowRight size={18} />
            </button>
          </form>

          <div className="login-security-note">
            <ShieldCheck size={17} />
            <span>
              Access is restricted to authorized company personnel and verified accounts.
            </span>
          </div>

          <Link href="/" className="login-back-link text-slate-500 mt-4 hover:text-slate-800 transition">
            ← Return to main homepage
          </Link>
        </div>

      </section>
    </main>
  );
}
