"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Landmark,
  UserPlus,
  Users,
  CreditCard,
  FileText,
  BadgeCheck,
  ChevronRight,
  Calculator,
  Lock,
  Layers,
  BarChart3,
  CheckCircle2,
  Menu,
  X,
  Clock,
  Search,
  ExternalLink,
} from "lucide-react";
import { MONEY } from "@/constants";

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
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* ── 1. Sticky Navigation Bar ────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-slate-950/85 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition">
              <Landmark size={24} />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                PSI <span className="text-indigo-400">ONE</span>
              </span>
              <span className="text-[10px] tracking-widest font-semibold uppercase text-slate-400">
                Loan Management System
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-white transition">Capabilities</a>
            <a href="#calculator" className="hover:text-white transition">Loan Estimator</a>
            <a href="#workflow" className="hover:text-white transition">How it Works</a>
            <a href="#compliance" className="hover:text-white transition">Security & KYC</a>
          </nav>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              href="/register"
              className="px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition border border-slate-700/60"
            >
              Register Customer
            </Link>
            <Link
              href="/login"
              className="px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition"
            >
              Staff Login
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 hover:-translate-y-0.5 transition"
            >
              Open Dashboard
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-400 hover:text-white lg:hidden rounded-lg hover:bg-slate-800 transition"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-b border-slate-800 bg-slate-950 px-6 py-6 space-y-4">
            <nav className="flex flex-col space-y-3 text-sm font-medium text-slate-300">
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
            <div className="pt-4 border-t border-slate-800 flex flex-col gap-2.5">
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-center text-sm flex items-center justify-center gap-2"
              >
                Open Dashboard
                <ArrowRight size={16} />
              </Link>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 border border-slate-700 bg-slate-900 text-white font-medium rounded-xl text-center text-xs"
                >
                  Register Customer
                </Link>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 border border-slate-700 bg-slate-900 text-white font-medium rounded-xl text-center text-xs"
                >
                  Staff Login
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ── 2. Hero Section ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-16 pb-24 md:pt-24 md:pb-32">
        {/* Ambient Glow Orbs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/20 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[350px] h-[250px] bg-blue-500/15 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Eyebrow Announcement Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800/90 border border-slate-700/80 text-xs font-semibold text-indigo-300 shadow-inner mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>PSI ONE LMS 2026</span>
            <span className="text-slate-500">·</span>
            <span>Enterprise Lending Intelligence</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.1] mb-6">
            Intelligent Lending Operations.{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-blue-400 bg-clip-text text-transparent">
              Zero Friction.
            </span>
          </h1>

          {/* Subtext */}
          <p className="text-base sm:text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10">
            The unified loan management operating system for microfinance lenders, credit unions, and non-banking institutions. Accelerate loan origination, streamline collections, and stay audit-ready every day.
          </p>

          {/* Primary Action Group */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:-translate-y-0.5 transition text-sm"
            >
              Enter LMS Dashboard
              <ArrowRight size={18} />
            </Link>

            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 font-semibold rounded-2xl transition text-sm"
            >
              <UserPlus size={18} className="text-indigo-400" />
              Register Customer
            </Link>
          </div>

          {/* Direct Route Hint */}
          <p className="mt-4 text-xs text-slate-500">
            LMS Staff Portal accessible directly via{" "}
            <code className="text-indigo-300 bg-slate-800/80 px-2 py-0.5 rounded font-mono">
              /dashboard
            </code>{" "}
            and{" "}
            <code className="text-indigo-300 bg-slate-800/80 px-2 py-0.5 rounded font-mono">
              /login
            </code>
          </p>

          {/* Hero Metrics Strip */}
          <div className="mt-16 pt-12 border-t border-slate-800/80 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60">
              <p className="text-2xl sm:text-3xl font-black text-white">LKR 850M+</p>
              <p className="text-xs text-slate-400 mt-1 font-medium">Disbursed Capital</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60">
              <p className="text-2xl sm:text-3xl font-black text-emerald-400">99.4%</p>
              <p className="text-xs text-slate-400 mt-1 font-medium">Collection Accuracy</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60">
              <p className="text-2xl sm:text-3xl font-black text-white">25 Districts</p>
              <p className="text-xs text-slate-400 mt-1 font-medium">Islandwide Coverage</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60">
              <p className="text-2xl sm:text-3xl font-black text-indigo-400">&lt; 2 Mins</p>
              <p className="text-xs text-slate-400 mt-1 font-medium">KYC Onboarding</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Live Interactive Loan Estimator Widget ──────────────────────── */}
      <section id="calculator" className="py-20 bg-slate-950 border-y border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/70 border border-indigo-800/60 px-3 py-1 rounded-full">
              Interactive Estimator
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-3">
              Calculate Loan Repayments
            </h2>
            <p className="text-slate-400 text-sm mt-2">
              Model loan disbursements, capital deductions, and weekly or monthly installment schedules in real time.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Controls: Sliders & Selectors */}
            <div className="lg:col-span-7 space-y-6">
              {/* Principal Amount */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="calc-principal" className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
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
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <div className="flex justify-between text-[11px] text-slate-500 mt-1 font-mono">
                  <span>LKR 25,000</span>
                  <span>LKR 750,000</span>
                  <span>LKR 1,500,000</span>
                </div>
              </div>

              {/* Term in Months */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="calc-term" className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
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
                      className={`py-2 text-xs font-bold rounded-xl border transition ${
                        calcTermMonths === term
                          ? "bg-indigo-600 border-indigo-500 text-white"
                          : "bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800"
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
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Collection Frequency
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCalcFrequency("Monthly")}
                      className={`py-2 text-xs font-bold rounded-xl border transition ${
                        calcFrequency === "Monthly"
                          ? "bg-indigo-600 border-indigo-500 text-white"
                          : "bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalcFrequency("Weekly")}
                      className={`py-2 text-xs font-bold rounded-xl border transition ${
                        calcFrequency === "Weekly"
                          ? "bg-indigo-600 border-indigo-500 text-white"
                          : "bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      Weekly
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="calc-rate" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
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
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 mt-2"
                  />
                </div>
              </div>
            </div>

            {/* Right Output Card */}
            <div className="lg:col-span-5 bg-gradient-to-br from-indigo-950/70 via-slate-900 to-slate-950 p-6 sm:p-7 rounded-2xl border border-indigo-800/50 space-y-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 block">
                Estimated Breakdown
              </span>

              <div className="pb-4 border-b border-slate-800">
                <span className="text-xs text-slate-400 block">
                  {calcFrequency} Installment
                </span>
                <span className="text-3xl sm:text-4xl font-extrabold text-white font-mono">
                  {MONEY(installmentAmount)}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Across {installmentCount} {calcFrequency.toLowerCase()} payments
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Total Interest</span>
                  <span className="font-semibold text-slate-200 font-mono">
                    {MONEY(totalInterest)}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Total Payable</span>
                  <span className="font-bold text-white font-mono">
                    {MONEY(totalPayable)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-t border-slate-800/80 pt-2">
                  <span className="text-slate-400">Capital Deduction (3% Fee)</span>
                  <span className="font-medium text-amber-400 font-mono">
                    - {MONEY(capitalDeduction)}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-300 font-semibold">Net Disbursed Cash</span>
                  <span className="font-bold text-emerald-400 font-mono text-sm">
                    {MONEY(netDisbursed)}
                  </span>
                </div>
              </div>

              <Link
                href="/dashboard"
                className="w-full mt-4 inline-flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-indigo-600/30"
              >
                Issue This Loan in Dashboard
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. Core Capabilities (Editorial Cards) ─────────────────────────── */}
      <section id="features" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/70 border border-indigo-800/60 px-3 py-1 rounded-full">
            Full Operations Suite
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white mt-3 tracking-tight">
            Designed for Financial Rigor
          </h2>
          <p className="text-slate-400 text-base mt-3">
            Every module is tailored for high-accuracy loan administration, fraud mitigation, and transparent borrower tracking.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Customer Onboarding */}
          <div className="bg-slate-950/60 border border-slate-800 p-6 rounded-2xl hover:border-indigo-600/60 transition group">
            <div className="w-12 h-12 rounded-xl bg-indigo-950 text-indigo-400 flex items-center justify-center mb-5 border border-indigo-800/50 group-hover:scale-110 transition">
              <Users size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              Borrower 360° & KYC
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Comprehensive profile records, Sri Lankan NIC validation (9V/X & 12-digit), portrait storage, and emergency contact mappings.
            </p>
            <Link
              href="/customers"
              className="text-xs font-semibold text-indigo-400 group-hover:text-indigo-300 inline-flex items-center gap-1 transition"
            >
              Customer Directory <ChevronRight size={14} />
            </Link>
          </div>

          {/* Card 2: Loan Origination */}
          <div className="bg-slate-950/60 border border-slate-800 p-6 rounded-2xl hover:border-indigo-600/60 transition group">
            <div className="w-12 h-12 rounded-xl bg-blue-950 text-blue-400 flex items-center justify-center mb-5 border border-blue-800/50 group-hover:scale-110 transition">
              <CreditCard size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              Loan Origination
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Flexible principal tiers, customizable interest rates, capital deduction underwriting, and multi-guarantor security stakes.
            </p>
            <Link
              href="/loans"
              className="text-xs font-semibold text-blue-400 group-hover:text-blue-300 inline-flex items-center gap-1 transition"
            >
              Loan Portfolio <ChevronRight size={14} />
            </Link>
          </div>

          {/* Card 3: Repayment & Collections */}
          <div className="bg-slate-950/60 border border-slate-800 p-6 rounded-2xl hover:border-indigo-600/60 transition group">
            <div className="w-12 h-12 rounded-xl bg-emerald-950 text-emerald-400 flex items-center justify-center mb-5 border border-emerald-800/50 group-hover:scale-110 transition">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              Daily Collections
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Field cashier collection sheets, instant receipt printing, automated loan balance reductions, and route cash reconciliation.
            </p>
            <Link
              href="/repayments"
              className="text-xs font-semibold text-emerald-400 group-hover:text-emerald-300 inline-flex items-center gap-1 transition"
            >
              Repayments Log <ChevronRight size={14} />
            </Link>
          </div>

          {/* Card 4: Reports & Audits */}
          <div className="bg-slate-950/60 border border-slate-800 p-6 rounded-2xl hover:border-indigo-600/60 transition group">
            <div className="w-12 h-12 rounded-xl bg-purple-950 text-purple-400 flex items-center justify-center mb-5 border border-purple-800/50 group-hover:scale-110 transition">
              <BarChart3 size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              CBSL Audit Reports
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Aging delinquency buckets, Portfolio-at-Risk (PAR) analysis, ledger exports, and tamper-evident administrative audit trails.
            </p>
            <Link
              href="/reports"
              className="text-xs font-semibold text-purple-400 group-hover:text-purple-300 inline-flex items-center gap-1 transition"
            >
              View Analytics <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── 5. Lending Workflow (Step-by-step) ─────────────────────────────── */}
      <section id="workflow" className="py-20 bg-slate-950 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/70 border border-indigo-800/60 px-3 py-1 rounded-full">
              Lifecycle
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-3">
              How Loans Flow in PSI ONE
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 relative">
              <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold text-sm flex items-center justify-center mb-4">
                1
              </span>
              <h4 className="text-base font-bold text-white mb-1.5">Borrower KYC</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Register customer credentials, upload identity proofs, and generate a persistent sequential ID.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 relative">
              <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold text-sm flex items-center justify-center mb-4">
                2
              </span>
              <h4 className="text-base font-bold text-white mb-1.5">Underwriting</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Define loan parameters, deduct documentation capital, and link verified guarantor profiles.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 relative">
              <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold text-sm flex items-center justify-center mb-4">
                3
              </span>
              <h4 className="text-base font-bold text-white mb-1.5">Disbursement</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Approve capital release, issue disbursement voucher, and initialize the automated installment ledger.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 relative">
              <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold text-sm flex items-center justify-center mb-4">
                4
              </span>
              <h4 className="text-base font-bold text-white mb-1.5">Repayment</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Track payments weekly or monthly, manage arrears, issue settlement letters upon loan maturity.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. Security, Compliance & Trust ────────────────────────────────── */}
      <section id="compliance" className="py-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-950 border border-indigo-800/60 rounded-3xl p-8 sm:p-12 shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 px-3 py-1 rounded-full">
                <ShieldCheck size={14} />
                Financial Consumer Protection
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                Institutional Security by Default
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Built strictly to adhere to the Sri Lanka Personal Data Protection Act No. 9 of 2022 and CBSL micro-credit supervisory directives. Complete role-based segregation ensures cashiers, underwriters, and administrators access only authorised data.
              </p>
              <div className="grid grid-cols-2 gap-3 pt-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <span>256-bit AES Encryption</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <span>Immutable Audit Trail</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <span>Multi-Tenant Segregation</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <span>Automated Ledger Reconciliations</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Quick Access Navigation
              </h4>
              <div className="space-y-2 text-xs">
                <Link
                  href="/dashboard"
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/80 hover:bg-indigo-600/20 hover:border-indigo-500/50 border border-slate-700/60 transition group"
                >
                  <span className="font-semibold text-white">LMS Management Dashboard</span>
                  <span className="font-mono text-indigo-400 group-hover:translate-x-0.5 transition">/dashboard →</span>
                </Link>
                <Link
                  href="/register"
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/80 hover:bg-indigo-600/20 hover:border-indigo-500/50 border border-slate-700/60 transition group"
                >
                  <span className="font-semibold text-white">Customer Registration</span>
                  <span className="font-mono text-indigo-400 group-hover:translate-x-0.5 transition">/register →</span>
                </Link>
                <Link
                  href="/login"
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/80 hover:bg-indigo-600/20 hover:border-indigo-500/50 border border-slate-700/60 transition group"
                >
                  <span className="font-semibold text-white">Authorized Staff Portal</span>
                  <span className="font-mono text-indigo-400 group-hover:translate-x-0.5 transition">/login →</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. High-Converting Bottom Banner ───────────────────────────────── */}
      <section className="py-20 text-center border-t border-slate-800 bg-slate-950">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Ready to Streamline Your Loan Portfolio?
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto mb-8">
            Access the complete operational suite to register customers, configure loans, and supervise collections in seconds.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-600/30 text-sm"
            >
              Open LMS Dashboard
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold rounded-xl transition text-sm"
            >
              New Customer Registration
            </Link>
          </div>
        </div>
      </section>

      {/* ── 8. Corporate Footer ────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-10 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
              PSI
            </span>
            <span className="text-slate-300 font-bold">PSI ONE Loan Management System</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-slate-400">
            <Link href="/dashboard" className="hover:text-white transition">Dashboard</Link>
            <Link href="/customers" className="hover:text-white transition">Borrowers</Link>
            <Link href="/loans" className="hover:text-white transition">Loans</Link>
            <Link href="/repayments" className="hover:text-white transition">Collections</Link>
            <Link href="/register" className="hover:text-white transition">Register</Link>
            <Link href="/login" className="hover:text-white transition">Login</Link>
          </div>

          <p>© 2026 PSI ONE LMS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
