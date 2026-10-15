"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  UserPlus,
  Users,
  CreditCard,
  BadgeCheck,
  Lock,
  BarChart3,
  CheckCircle2,
  Menu,
  X,
  PhoneCall,
  Building2,
} from "lucide-react";
import { MONEY } from "@/constants";
import { BrandLogo } from "@/components/brand-logo";

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Live Loan Calculator State
  const [calcPrincipal, setCalcPrincipal] = useState(250000);
  const [calcTermMonths, setCalcTermMonths] = useState(12);
  const [calcRateMonthly, setCalcRateMonthly] = useState(2.0); // 2% per month
  const [calcFrequency, setCalcFrequency] = useState<"Monthly" | "Weekly">("Monthly");

  // Calculations
  const totalInterest = Math.round(calcPrincipal * (calcRateMonthly / 100) * calcTermMonths);
  const totalPayable = calcPrincipal + totalInterest;
  const capitalDeduction = Math.round(calcPrincipal * 0.03); // 3% processing fee
  const netDisbursed = calcPrincipal - capitalDeduction;

  const installmentCount = calcFrequency === "Monthly" ? calcTermMonths : calcTermMonths * 4;
  const installmentAmount = Math.ceil(totalPayable / installmentCount);

  return (
    <div className="min-h-screen bg-[#09090b] text-slate-100 font-sans selection:bg-red-600 selection:text-white">
      {/* ── 1. Sticky Navigation Bar ────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#09090b]/90 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo & Brand */}
          <BrandLogo href="/" size="md" theme="dark" />

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-zinc-300">
            <a href="#features" className="hover:text-white transition">Capabilities</a>
            <a href="#calculator" className="hover:text-white transition">Loan Estimator</a>
            <a href="#workflow" className="hover:text-white transition">How it Works</a>
            <a href="#compliance" className="hover:text-white transition">Security & KYC</a>
          </nav>

          {/* Action CTAs (No Dashboard links) */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800/80 rounded-xl transition"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-red-600/30 hover:shadow-red-600/50 hover:-translate-y-0.5 transition"
            >
              <UserPlus size={15} />
              Register Customer
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-zinc-400 hover:text-white lg:hidden rounded-lg hover:bg-zinc-800 transition"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-b border-zinc-800 bg-[#09090b] px-6 py-6 space-y-4">
            <nav className="flex flex-col space-y-3 text-sm font-medium text-zinc-300">
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-white transition"
              >
                Capabilities
              </a>
              <a
                href="#calculator"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-white transition"
              >
                Loan Estimator
              </a>
              <a
                href="#workflow"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-white transition"
              >
                How it Works
              </a>
              <a
                href="#compliance"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-white transition"
              >
                Security & KYC
              </a>
            </nav>
            <div className="pt-4 border-t border-zinc-800 flex flex-col gap-2.5">
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-center text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/30"
              >
                <UserPlus size={16} />
                Register 
              </Link>
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 border border-zinc-700 bg-zinc-900 text-white font-medium rounded-xl text-center text-xs"
              >
                Staff Login
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── 2. Hero Section ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-16 pb-24 md:pt-24 md:pb-32">
        {/* Ambient Glow Orbs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-red-600/15 blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[380px] h-[280px] bg-[#4c0519]/40 blur-[110px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Eyebrow Announcement Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-xs font-semibold text-rose-300 shadow-inner mb-6">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span>PSI ONE LOAN MANAGEMENT SYSTEM 2026</span>
            <span className="text-zinc-600">·</span>
            <span>Enterprise Lending Operations</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.1] mb-6">
            Intelligent Lending Operations.{" "}
            <span className="bg-gradient-to-r from-red-500 via-rose-300 to-white bg-clip-text text-transparent">
              Zero Friction.
            </span>
          </h1>

          {/* Subtext */}
          <p className="text-base sm:text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed mb-10">
            The unified loan management operating system for microfinance lenders, credit unions, and non-banking institutions. Accelerate loan origination, streamline collections, and stay audit-ready every day.
          </p>

          {/* Primary Action Group (No Dashboard links) */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-2xl shadow-xl shadow-red-600/30 hover:shadow-red-600/50 hover:-translate-y-0.5 transition text-sm"
            >
              <UserPlus size={18} />
              Register New Borrower
            </Link>

            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 font-semibold rounded-2xl transition text-sm"
            >
              Authorized Staff Portal
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* Direct Route Hint */}
          <p className="mt-4 text-xs text-zinc-500">
            Internal loan officers and staff can access their workspace via{" "}
            <Link href="/login" className="text-red-400 hover:underline font-mono">
              /login
            </Link>
          </p>

          {/* Hero Metrics Strip */}
          <div className="mt-16 pt-12 border-t border-zinc-800/80 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="p-4 rounded-xl bg-black/60 border border-zinc-800/80">
              <p className="text-2xl sm:text-3xl font-black text-white">LKR 850M+</p>
              <p className="text-xs text-zinc-400 mt-1 font-medium">Disbursed Capital</p>
            </div>
            <div className="p-4 rounded-xl bg-black/60 border border-zinc-800/80">
              <p className="text-2xl sm:text-3xl font-black text-emerald-400">99.4%</p>
              <p className="text-xs text-zinc-400 mt-1 font-medium">Collection Accuracy</p>
            </div>
            <div className="p-4 rounded-xl bg-black/60 border border-zinc-800/80">
              <p className="text-2xl sm:text-3xl font-black text-white">25 Districts</p>
              <p className="text-xs text-zinc-400 mt-1 font-medium">Islandwide Coverage</p>
            </div>
            <div className="p-4 rounded-xl bg-black/60 border border-zinc-800/80">
              <p className="text-2xl sm:text-3xl font-black text-rose-400">&lt; 2 Mins</p>
              <p className="text-xs text-zinc-400 mt-1 font-medium">KYC Onboarding</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Live Interactive Loan Estimator Widget ──────────────────────── */}
      <section id="calculator" className="py-20 bg-black border-y border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400 bg-rose-950/70 border border-rose-800/60 px-3 py-1 rounded-full">
              Interactive Estimator
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-3">
              Calculate Loan Repayments
            </h2>
            <p className="text-zinc-400 text-sm mt-2">
              Model loan disbursements, capital deductions, and weekly or monthly installment schedules in real time.
            </p>
          </div>

          <div className="bg-[#121215] border border-zinc-800 rounded-3xl p-6 sm:p-10 shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Controls: Sliders & Selectors */}
            <div className="lg:col-span-7 space-y-6">
              {/* Principal Amount */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="calc-principal" className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                    Principal Amount
                  </label>
                  <span className="text-lg font-black text-white font-mono">
                    {MONEY(calcPrincipal)}
                  </span>
                </div>
                <input
                  id="calc-principal"
                  type="range"
                  min="25000"
                  max="1500000"
                  step="25000"
                  value={calcPrincipal}
                  onChange={(e) => setCalcPrincipal(Number(e.target.value))}
                  className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-red-600"
                />
                <div className="flex justify-between text-[11px] text-zinc-500 mt-1 font-mono">
                  <span>LKR 25,000</span>
                  <span>LKR 750,000</span>
                  <span>LKR 1,500,000</span>
                </div>
              </div>

              {/* Term in Months */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                    Tenure / Term
                  </label>
                  <span className="text-base font-bold text-white">
                    {calcTermMonths} Months {calcFrequency === "Weekly" && `(${calcTermMonths * 4} Weeks)`}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[6, 12, 18, 24].map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => setCalcTermMonths(term)}
                      className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                        calcTermMonths === term
                          ? "bg-red-600 border-red-500 text-white shadow-md shadow-red-600/30"
                          : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-850"
                      }`}
                    >
                      {term} Mos
                    </button>
                  ))}
                </div>
              </div>

              {/* Repayment Frequency & Monthly Rate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                    Collection Frequency
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCalcFrequency("Monthly")}
                      className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                        calcFrequency === "Monthly"
                          ? "bg-red-600 border-red-500 text-white shadow-md shadow-red-600/30"
                          : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-850"
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalcFrequency("Weekly")}
                      className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                        calcFrequency === "Weekly"
                          ? "bg-red-600 border-red-500 text-white shadow-md shadow-red-600/30"
                          : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-850"
                      }`}
                    >
                      Weekly
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="calc-rate" className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                    Monthly Interest Rate: <span className="text-white font-mono">{calcRateMonthly.toFixed(1)}%</span>
                  </label>
                  <input
                    id="calc-rate"
                    type="range"
                    min="1.0"
                    max="4.0"
                    step="0.25"
                    value={calcRateMonthly}
                    onChange={(e) => setCalcRateMonthly(Number(e.target.value))}
                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-red-600 mt-2"
                  />
                </div>
              </div>
            </div>

            {/* Right Output Card (Deep Obsidian + Rich Maroon Gradient) */}
            <div className="lg:col-span-5 bg-gradient-to-br from-[#2b040d] via-[#140206] to-black p-6 sm:p-7 rounded-2xl border border-red-900/50 space-y-4 shadow-xl">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-300 block">
                Estimated Breakdown
              </span>

              <div className="pb-4 border-b border-zinc-800">
                <span className="text-xs text-zinc-400 block">
                  {calcFrequency} Installment
                </span>
                <span className="text-3xl sm:text-4xl font-extrabold text-white font-mono">
                  {MONEY(installmentAmount)}
                </span>
                <span className="text-[11px] text-zinc-400 mt-1 block">
                  Across {installmentCount} {calcFrequency.toLowerCase()} payments
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1">
                  <span className="text-zinc-400">Total Interest</span>
                  <span className="font-semibold text-zinc-200 font-mono">
                    {MONEY(totalInterest)}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-zinc-400">Total Payable</span>
                  <span className="font-bold text-white font-mono">
                    {MONEY(totalPayable)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-t border-zinc-800/80 pt-2">
                  <span className="text-zinc-400">Capital Deduction (3% Fee)</span>
                  <span className="font-medium text-amber-400 font-mono">
                    - {MONEY(capitalDeduction)}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-zinc-300 font-semibold">Net Disbursed Cash</span>
                  <span className="font-bold text-emerald-400 font-mono text-sm">
                    {MONEY(netDisbursed)}
                  </span>
                </div>
              </div>

              <Link
                href="/register"
                className="w-full mt-4 inline-flex items-center justify-center gap-2 py-3 px-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-red-600/30 hover:shadow-red-600/50 hover:-translate-y-0.5"
              >
                Apply for this Loan Structure
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. Core Capabilities (Editorial Cards) ─────────────────────────── */}
      <section id="features" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-400 bg-rose-950/70 border border-rose-800/60 px-3 py-1 rounded-full">
            Full Operations Suite
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white mt-3 tracking-tight">
            Designed for Financial Rigor
          </h2>
          <p className="text-zinc-400 text-base mt-3">
            Every module is tailored for high-accuracy loan administration, fraud mitigation, and transparent borrower tracking.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Customer Onboarding */}
          <div className="bg-black/60 border border-zinc-800 p-6 rounded-2xl hover:border-red-600/50 transition group">
            <div className="w-12 h-12 rounded-xl bg-red-950/70 text-red-400 flex items-center justify-center mb-5 border border-red-900/50 group-hover:scale-110 transition">
              <Users size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              Borrower 360° & KYC
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-4">
              Comprehensive profile records, Sri Lankan NIC validation (9V/X & 12-digit), portrait storage, and emergency contact mappings.
            </p>
            <span className="text-xs font-semibold text-rose-400 flex items-center gap-1">
              Central Bank KYC Compliant
            </span>
          </div>

          {/* Card 2: Loan Origination */}
          <div className="bg-black/60 border border-zinc-800 p-6 rounded-2xl hover:border-red-600/50 transition group">
            <div className="w-12 h-12 rounded-xl bg-[#3f0713] text-rose-300 flex items-center justify-center mb-5 border border-rose-900/50 group-hover:scale-110 transition">
              <CreditCard size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              Loan Origination
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-4">
              Flexible principal tiers, customizable interest rates, capital deduction underwriting, and multi-guarantor security stakes.
            </p>
            <span className="text-xs font-semibold text-rose-400 flex items-center gap-1">
              Multi-Guarantor Security
            </span>
          </div>

          {/* Card 3: Repayment & Collections */}
          <div className="bg-black/60 border border-zinc-800 p-6 rounded-2xl hover:border-red-600/50 transition group">
            <div className="w-12 h-12 rounded-xl bg-zinc-900 text-emerald-400 flex items-center justify-center mb-5 border border-emerald-900/40 group-hover:scale-110 transition">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              Daily Collections
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-4">
              Field cashier collection sheets, instant receipt printing, automated loan balance reductions, and route cash reconciliation.
            </p>
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
              Real-Time Ledger Updates
            </span>
          </div>

          {/* Card 4: Reports & Audits */}
          <div className="bg-black/60 border border-zinc-800 p-6 rounded-2xl hover:border-red-600/50 transition group">
            <div className="w-12 h-12 rounded-xl bg-[#2b040d] text-rose-300 flex items-center justify-center mb-5 border border-red-900/50 group-hover:scale-110 transition">
              <BarChart3 size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              CBSL Audit Reports
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-4">
              Aging delinquency buckets, Portfolio-at-Risk (PAR) analysis, ledger exports, and tamper-evident administrative audit trails.
            </p>
            <span className="text-xs font-semibold text-rose-400 flex items-center gap-1">
              Statutory Accounting Standard
            </span>
          </div>
        </div>
      </section>

      {/* ── 5. Lending Workflow (Step-by-step) ─────────────────────────────── */}
      <section id="workflow" className="py-20 bg-black border-t border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400 bg-rose-950/70 border border-rose-800/60 px-3 py-1 rounded-full">
              Lifecycle
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-3">
              How Loans Flow in PSI ONE
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            <div className="p-6 rounded-2xl bg-[#121215] border border-zinc-800 relative">
              <span className="w-8 h-8 rounded-lg bg-red-600 text-white font-bold text-sm flex items-center justify-center mb-4 shadow-md shadow-red-600/30">
                1
              </span>
              <h4 className="text-base font-bold text-white mb-1.5">Borrower KYC</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Register customer credentials, upload identity proofs, and generate a persistent sequential ID.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#121215] border border-zinc-800 relative">
              <span className="w-8 h-8 rounded-lg bg-red-600 text-white font-bold text-sm flex items-center justify-center mb-4 shadow-md shadow-red-600/30">
                2
              </span>
              <h4 className="text-base font-bold text-white mb-1.5">Underwriting</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Define loan parameters, deduct documentation capital, and link verified guarantor profiles.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#121215] border border-zinc-800 relative">
              <span className="w-8 h-8 rounded-lg bg-red-600 text-white font-bold text-sm flex items-center justify-center mb-4 shadow-md shadow-red-600/30">
                3
              </span>
              <h4 className="text-base font-bold text-white mb-1.5">Disbursement</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Approve capital release, issue disbursement voucher, and initialize the automated installment ledger.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#121215] border border-zinc-800 relative">
              <span className="w-8 h-8 rounded-lg bg-red-600 text-white font-bold text-sm flex items-center justify-center mb-4 shadow-md shadow-red-600/30">
                4
              </span>
              <h4 className="text-base font-bold text-white mb-1.5">Repayment</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Track payments weekly or monthly, manage arrears, issue settlement letters upon loan maturity.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. Security, Compliance & Trust ────────────────────────────────── */}
      <section id="compliance" className="py-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-[#220409] via-zinc-950 to-black border border-red-900/50 rounded-3xl p-8 sm:p-12 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-300 bg-rose-950/70 border border-rose-800/60 px-3 py-1 rounded-full">
                <ShieldCheck size={14} className="text-red-400" />
                Financial Consumer Protection
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                Institutional Security by Default
              </h3>
              <p className="text-zinc-300 text-sm leading-relaxed">
                Built strictly to adhere to the Sri Lanka Personal Data Protection Act No. 9 of 2022 and CBSL micro-credit supervisory directives. Complete role-based segregation ensures cashiers, underwriters, and administrators access only authorised data.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-zinc-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <span>256-bit AES Data Encryption</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <span>Immutable Audit Trail Logging</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <span>Multi-Tenant Data Segregation</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <span>Automated Ledger Reconciliations</span>
                </div>
              </div>
            </div>

            {/* Institutional Verification Card */}
            <div className="lg:col-span-5 bg-[#0e0e11] border border-zinc-800 p-6 rounded-2xl space-y-4 shadow-xl">
              <div className="flex items-center gap-3 pb-3 border-b border-zinc-800">
                <div className="w-10 h-10 rounded-xl bg-red-950/70 text-red-400 flex items-center justify-center font-bold border border-red-900/50">
                  <Building2 size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Regulatory Assurance
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    CBSL Micro-Credit Framework
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-zinc-300">
                <div className="flex items-start gap-2.5">
                  <BadgeCheck size={16} className="text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block font-medium">PDPA Compliant Vault</strong>
                    <span className="text-[11px] text-zinc-400">Borrower documents and NIC scans are stored in encrypted cold storage.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Lock size={16} className="text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block font-medium">Role-Based Access Control</strong>
                    <span className="text-[11px] text-zinc-400">Field cashiers and collectors have partitioned, read-safe interfaces.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <PhoneCall size={16} className="text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block font-medium">Operations Support</strong>
                    <span className="text-[11px] text-zinc-400">Branch supervision assistance available during standard working hours.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. High-Converting Bottom Banner (No Dashboard links) ──────────── */}
      <section className="py-20 text-center border-t border-zinc-800 bg-black">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Ready to Streamline Your Loan Portfolio?
          </h2>
          <p className="text-zinc-400 text-sm sm:text-base max-w-xl mx-auto mb-8">
            Register new borrowers with verified KYC credentials or sign in with your staff account to begin operations.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition shadow-lg shadow-red-600/30 hover:shadow-red-600/50 hover:-translate-y-0.5 text-sm"
            >
              <UserPlus size={16} />
              Register as New Borrower
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-semibold rounded-xl transition text-sm"
            >
              Authorized Staff Login →
            </Link>
          </div>
        </div>
      </section>

      {/* ── 8. Corporate Footer (No Dashboard links) ───────────────────────── */}
      <footer className="border-t border-zinc-900 bg-[#050507] py-10 text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <BrandLogo href="/" size="sm" theme="dark" />

          <div className="flex flex-wrap items-center justify-center gap-6 text-zinc-400">
            <a href="#features" className="hover:text-white transition">Capabilities</a>
            <a href="#calculator" className="hover:text-white transition">Loan Estimator</a>
            <a href="#workflow" className="hover:text-white transition">How it Works</a>
            <a href="#compliance" className="hover:text-white transition">Security & KYC</a>
            <Link href="/register" className="hover:text-white transition">Borrower Registration</Link>
            <Link href="/login" className="hover:text-white transition">Staff Login</Link>
          </div>

          <p>© 2026 PSI One Loan Management System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
