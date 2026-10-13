
"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Fingerprint,
  Landmark,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="login-page">
      {/* Left side - Branding */}
      <section className="login-visual">
        <div className="login-visual-glow login-glow-one" />
        <div className="login-visual-glow login-glow-two" />

        <Link href="/" className="login-brand">
          <span className="login-brand-icon">
            <Landmark size={24} />
          </span>

          <span>
            PSI <b>ONE</b>
            <small>LOAN MANAGEMENT</small>
          </span>
        </Link>

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
            Manage customers, track repayments, and make
            confident lending decisions — all from one
            secure workspace.
          </p>

          <div className="login-feature-list">
            <div>
              <span><ShieldCheck size={18} /></span>
              <section>
                <strong>Secure by design</strong>
                <small>
                  Your financial workspace, built with care.
                </small>
              </section>
            </div>

            <div>
              <span><Fingerprint size={18} /></span>
              <section>
                <strong>Simple loan tracking</strong>
                <small>
                  Keep customer and repayment details organised.
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
          <div className="login-mobile-brand">
            <span className="login-brand-icon">
              <Landmark size={22} />
            </span>
            <span>PSI <b>ONE</b></span>
          </div>

          <div className="login-welcome-icon">
            <LockKeyhole size={22} />
          </div>

          <p className="login-eyebrow">WELCOME BACK</p>

          <h2>Sign in to your account</h2>

          <p className="login-intro">
            Enter your details below to access your workspace.
          </p>

          <form action="/" className="login-form">
            <label htmlFor="login-email">Email address</label>

            <div className="login-input-wrap">
              <Mail size={18} />

              <input
                id="login-email"
                name="email"
                type="email"
                placeholder="name@company.com"
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
                    "Password reset will be available when authentication is connected."
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
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                className="login-eye-button"
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>

            <label className="login-remember">
              <input type="checkbox" name="remember" />
              <span>Remember me on this device</span>
            </label>

            <button type="submit" className="login-submit">
              Login
              <ArrowRight size={18} />
            </button>
          </form>

          <div className="login-security-note">
            <ShieldCheck size={17} />
            <span>
              Access is intended for authorised staff only.
            </span>
          </div>

          <p className="login-demo-note">
            Demo interface · Authentication is not connected yet
          </p>

          <Link href="/" className="login-back-link">
            ← Back to dashboard preview
          </Link>
        </div>

        <footer className="login-copyright">
          © {new Date().getFullYear()} PSI ONE. All rights reserved.
        </footer>
      </section>
    </main>
  );
}
