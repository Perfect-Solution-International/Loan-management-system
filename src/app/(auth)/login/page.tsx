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
  AlertCircle,
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

  // Centralized login submission handler with role-based routing
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const term = identifier.trim().toLowerCase();
    if (!term) {
      setErrorMsg("Please enter your email, username, or Customer ID / NIC.");
      return;
    }

    // 1. Match customer by Customer ID, NIC, email, or phone
    const matchedCustomer = customers.find(
      (c) =>
        c.id.toLowerCase() === term ||
        c.nic.toLowerCase() === term ||
        (c.email && c.email.toLowerCase() === term) ||
        c.phone.replace(/[^0-9]/g, "") === term.replace(/[^0-9]/g, "")
    );

    if (matchedCustomer) {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("customerSessionId", matchedCustomer.id);
      }
      router.push(`/customerdashboard?customerId=${matchedCustomer.id}`);
      return;
    }

    // 2. Match staff user by email, Staff ID, or name
    const matchedStaff = staffUsers.find(
      (s) =>
        s.email.toLowerCase() === term ||
        s.id.toLowerCase() === term ||
        s.name.toLowerCase() === term
    );

    if (matchedStaff) {
      if (typeof window !== "undefined") {
        localStorage.setItem("psi_active_staff_id", matchedStaff.id);
      }

      // If Field Officer or Collection Agent -> route directly to /field app!
      if (
        matchedStaff.role === "Loan Officer" ||
        matchedStaff.role === "Collection Agent"
      ) {
        router.push("/field");
        return;
      }

      // Administrator / Auditor -> route to operations dashboard
      router.push("/dashboard");
      return;
    }

    // 3. Fallback checks for keywords
    if (term.includes("field") || term.includes("agent") || term.includes("officer") || term.startsWith("stf")) {
      router.push("/field");
      return;
    }

    // Default: Administrator dashboard
    router.push("/dashboard");
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
                <strong>Secure by design</strong>
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

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 mb-4">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
              <p>{errorMsg}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <label htmlFor="login-identifier">Email, Username, or Customer ID / NIC</label>
            <div className="login-input-wrap">
              <Mail size={18} />
              <input
                id="login-identifier"
                name="identifier"
                type="text"
                placeholder="admin@psione.lk or Customer ID / NIC"
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
                placeholder="Enter your password"
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

        <footer className="login-copyright">
          © 2026 PSI ONE. All rights reserved.
        </footer>
      </section>
    </main>
  );
}
