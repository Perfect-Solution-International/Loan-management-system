"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import {
  ArrowRight,
  AtSign,
  CheckCircle2,
  Eye,
  EyeOff,
  Landmark,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { useData } from "@/providers/data-provider";
import type { Customer } from "@/types";

export default function RegisterPage() {
  const { customers, addCustomer } = useData();

  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSuccess, setIsSuccess] = useState(false);
  const [registeredName, setRegisteredName] = useState("");
  const [assignedId, setAssignedId] = useState("");

  // Helper to generate sequential Customer ID starting from CUS-001, CUS-002, etc.
  const generateCustomerId = useCallback(() => {
    const highestNum = customers.reduce((max, c) => {
      const match = c.id.match(/^CUS-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    const nextNum = highestNum + 1;
    return `CUS-${String(nextNum).padStart(3, "0")}`;
  }, [customers]);

  const validateField = (field: string, value: string): string => {
    switch (field) {
      case "name":
        if (!value.trim()) return "Full name is required";
        if (value.trim().length < 2) return "Name must be at least 2 characters";
        return "";
      case "username":
        if (!value.trim()) return "Username is required";
        if (value.trim().length < 3) return "Username must be at least 3 characters";
        if (!/^[a-zA-Z0-9_.-]+$/.test(value.trim())) {
          return "Username can only contain letters, numbers, underscores, or hyphens";
        }
        return "";
      case "email":
        if (!value.trim()) return "Email address is required";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
          return "Please enter a valid email address";
        }
        return "";
      case "password":
        if (!value) return "Password is required";
        if (value.length < 6) return "Password must be at least 6 characters";
        return "";
      default:
        return "";
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, form[field as keyof typeof form]);
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      const error = validateField(field, value);
      setErrors((prev) => ({ ...prev, [field]: error }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors = {
      name: validateField("name", form.name),
      username: validateField("username", form.username),
      email: validateField("email", form.email),
      password: validateField("password", form.password),
    };

    setTouched({
      name: true,
      username: true,
      email: true,
      password: true,
    });

    setErrors(newErrors);

    const hasError = Object.values(newErrors).some((err) => Boolean(err));
    if (hasError) return;

    // Generate Customer ID and persist customer
    const newId = generateCustomerId();
    const newCustomer: Customer = {
      id: newId,
      name: form.name.trim(),
      fullName: form.name.trim(),
      nic: form.username.trim().toUpperCase(),
      email: form.email.trim(),
      phone: "",
      address: "",
      village: "",
      town: "",
      district: "Colombo",
      monthlyIncome: 0,
      status: "Active",
      registeredAt: new Date().toISOString(),
    };

    addCustomer(newCustomer);
    setRegisteredName(form.name.trim());
    setAssignedId(newId);
    setIsSuccess(true);
  };

  const handleReset = () => {
    setForm({
      name: "",
      username: "",
      email: "",
      password: "",
    });
    setErrors({});
    setTouched({});
    setIsSuccess(false);
    setRegisteredName("");
    setAssignedId("");
  };

  return (
    <main className="login-page">
      {/* Left side - Branding & Value Proposition */}
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
            FAST & TRANSPARENT ONBOARDING
          </span>

          <h1>
            Simple lending.
            <br />
            <span>Built for you.</span>
          </h1>

          <p>
            Create your customer account to access loan options, track your
            applications, and manage repayments with complete transparency.
          </p>

          <div className="login-feature-list">
            <div>
              <span>
                <ShieldCheck size={18} />
              </span>
              <section>
                <strong>Secure by design</strong>
                <small>Bank-grade data encryption and privacy protection.</small>
              </section>
            </div>

            <div>
              <span>
                <UserCheck size={18} />
              </span>
              <section>
                <strong>Instant profile creation</strong>
                <small>Get set up and verified in under two minutes.</small>
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

      {/* Right side - Registration Form */}
      <section className="login-form-side">
        <div className="login-form-wrap">
          <div className="login-mobile-brand">
            <span className="login-brand-icon">
              <Landmark size={22} />
            </span>
            <span>
              PSI <b>ONE</b>
            </span>
          </div>

          {isSuccess ? (
            /* Success confirmation card */
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <CheckCircle2 size={30} />
              </div>

              <p className="login-eyebrow" style={{ color: "#059669" }}>
                REGISTRATION COMPLETE
              </p>

              <h2>Account Created!</h2>

              <p className="login-intro" style={{ marginBottom: "20px" }}>
                Welcome, <strong>{registeredName}</strong>. Your account has been registered with ID:{" "}
                <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  {assignedId}
                </span>
              </p>

              <div className="space-y-3 pt-2">
                <Link
                  href="/login"
                  className="login-submit"
                  style={{ textDecoration: "none" }}
                >
                  Proceed to Login
                  <ArrowRight size={18} />
                </Link>

                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition"
                >
                  Register another customer
                </button>

                <Link href="/" className="login-back-link pt-2">
                  ← Back to dashboard preview
                </Link>
              </div>
            </div>
          ) : (
            /* Minimal Registration Form */
            <>
              <div className="login-welcome-icon">
                <UserPlus size={22} />
              </div>

              <p className="login-eyebrow">CREATE ACCOUNT</p>

              <h2>Customer Registration</h2>

              <p className="login-intro">
                Enter your details below to create your customer account.
              </p>

              <form onSubmit={handleSubmit} className="login-form" noValidate>
                {/* Full Name */}
                <label htmlFor="reg-name">Full Name</label>
                <div
                  className="login-input-wrap"
                  style={{
                    borderColor:
                      touched.name && errors.name ? "#f43f5e" : undefined,
                  }}
                >
                  <User size={18} />
                  <input
                    id="reg-name"
                    name="name"
                    type="text"
                    value={form.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    onBlur={() => handleBlur("name")}
                    autoComplete="off"
                    spellCheck={false}
                    required
                  />
                </div>
                {touched.name && errors.name && (
                  <p
                    style={{
                      color: "#e11d48",
                      fontSize: "11px",
                      marginTop: "-16px",
                      marginBottom: "14px",
                    }}
                  >
                    {errors.name}
                  </p>
                )}

                {/* Username */}
                <label htmlFor="reg-username">Username</label>
                <div
                  className="login-input-wrap"
                  style={{
                    borderColor:
                      touched.username && errors.username
                        ? "#f43f5e"
                        : undefined,
                  }}
                >
                  <AtSign size={18} />
                  <input
                    id="reg-username"
                    name="username"
                    type="text"
                    value={form.username}
                    onChange={(e) => handleChange("username", e.target.value)}
                    onBlur={() => handleBlur("username")}
                    autoComplete="off"
                    spellCheck={false}
                    required
                  />
                </div>
                {touched.username && errors.username && (
                  <p
                    style={{
                      color: "#e11d48",
                      fontSize: "11px",
                      marginTop: "-16px",
                      marginBottom: "14px",
                    }}
                  >
                    {errors.username}
                  </p>
                )}

                {/* Email Address */}
                <label htmlFor="reg-email">Email address</label>
                <div
                  className="login-input-wrap"
                  style={{
                    borderColor:
                      touched.email && errors.email ? "#f43f5e" : undefined,
                  }}
                >
                  <Mail size={18} />
                  <input
                    id="reg-email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    onBlur={() => handleBlur("email")}
                    autoComplete="off"
                    spellCheck={false}
                    required
                  />
                </div>
                {touched.email && errors.email && (
                  <p
                    style={{
                      color: "#e11d48",
                      fontSize: "11px",
                      marginTop: "-16px",
                      marginBottom: "14px",
                    }}
                  >
                    {errors.email}
                  </p>
                )}

                {/* Password */}
                <label htmlFor="reg-password">Password</label>
                <div
                  className="login-input-wrap"
                  style={{
                    borderColor:
                      touched.password && errors.password
                        ? "#f43f5e"
                        : undefined,
                  }}
                >
                  <LockKeyhole size={18} />
                  <input
                    id="reg-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    onBlur={() => handleBlur("password")}
                    autoComplete="new-password"
                    spellCheck={false}
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
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {touched.password && errors.password && (
                  <p
                    style={{
                      color: "#e11d48",
                      fontSize: "11px",
                      marginTop: "-16px",
                      marginBottom: "14px",
                    }}
                  >
                    {errors.password}
                  </p>
                )}

                <button type="submit" className="login-submit">
                  Create Account
                  <ArrowRight size={18} />
                </button>
              </form>

              <div className="login-security-note">
                <ShieldCheck size={17} />
                <span>Protected by 256-bit bank-grade encryption.</span>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Already have an account?</span>
                <Link
                  href="/login"
                  className="font-semibold text-indigo-600 hover:text-indigo-800 transition"
                >
                  Sign in →
                </Link>
              </div>

              <Link href="/" className="login-back-link">
                ← Back to dashboard preview
              </Link>
            </>
          )}
        </div>

        <footer className="login-copyright">
          © 2026 PSI ONE. All rights reserved.
        </footer>
      </section>
    </main>
  );
}
