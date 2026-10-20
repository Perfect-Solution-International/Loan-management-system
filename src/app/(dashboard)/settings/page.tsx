"use client";

import React, { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Shield,
  ShieldCheck,
  Percent,
  Sliders,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Save,
  RotateCcw,
  Lock,
  Building,
  Search,
  X,
  FileText,
  Calculator,
  Check,
  ArrowUpRight,
  CreditCard,
} from "lucide-react";
import { useData } from "@/providers/data-provider";
import { initialSettings } from "@/lib/demo-data";
import { MONEY } from "@/constants";
import type { SystemSettings } from "@/types";

function SettingsContent() {
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const initialTab = rawTab === "security" ? "security" : "rules";

  const { settings, updateSettings } = useData();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<"rules" | "security">(initialTab);

  // Settings form state
  const [formSettings, setFormSettings] = useState<SystemSettings>({
    systemName: settings.systemName || "PSI ONE Loan Management System",
    currency: settings.currency || "LKR",
    defaultMonthlyRate: settings.defaultMonthlyRate ?? 3.0,
    defaultWeeklyRate: settings.defaultWeeklyRate ?? 0.8,
    defaultDailyRate: settings.defaultDailyRate ?? 0.15,
    defaultCapitalDeductionRate: settings.defaultCapitalDeductionRate ?? 1.5,
    defaultInterestDeductionMethod: settings.defaultInterestDeductionMethod || "UPFRONT",
    defaultProcessingFee: settings.defaultProcessingFee ?? 1500,
    defaultAdminFee: settings.defaultAdminFee ?? 500,
    lateFeePercentage: settings.lateFeePercentage ?? 2.0,
    gracePeriodDays: settings.gracePeriodDays ?? 3,
  });

  // Simulator test inputs
  const [simPrincipal, setSimPrincipal] = useState<number>(100000);
  const [simDuration, setSimDuration] = useState<number>(6); // months

  // Notification feedback
  const [notificationMsg, setNotificationMsg] = useState("");

  // Handle saving financial configuration
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formSettings);
    setNotificationMsg("System configuration & interest rate rules saved successfully!");
    setTimeout(() => setNotificationMsg(""), 4500);
  };

  // Handle restoring factory default configuration
  const handleResetDefaults = () => {
    if (confirm("Are you sure you want to restore factory default calculation rules?")) {
      setFormSettings(initialSettings);
      updateSettings(initialSettings);
      setNotificationMsg("System settings restored to factory defaults.");
      setTimeout(() => setNotificationMsg(""), 4500);
    }
  };

  // Live calculation simulator computations
  const simCalculations = useMemo(() => {
    const principal = Number(simPrincipal) || 0;
    const months = Number(simDuration) || 1;
    const monthlyRate = Number(formSettings.defaultMonthlyRate) || 0;
    const totalInterest = (principal * (monthlyRate / 100)) * months;
    const capitalDeduction = (principal * (Number(formSettings.defaultCapitalDeductionRate) || 0)) / 100;
    const processingFee = Number(formSettings.defaultProcessingFee) || 0;
    const adminFee = Number(formSettings.defaultAdminFee) || 0;

    const totalUpfrontDeductions =
      formSettings.defaultInterestDeductionMethod === "UPFRONT"
        ? capitalDeduction + totalInterest + processingFee + adminFee
        : capitalDeduction + processingFee + adminFee;

    const netDisbursement = Math.max(0, principal - totalUpfrontDeductions);
    const totalRepayment =
      formSettings.defaultInterestDeductionMethod === "UPFRONT"
        ? principal
        : principal + totalInterest;

    const monthlyInstallment = totalRepayment / months;

    return {
      principal,
      totalInterest,
      capitalDeduction,
      processingFee,
      adminFee,
      totalUpfrontDeductions,
      netDisbursement,
      totalRepayment,
      monthlyInstallment,
    };
  }, [simPrincipal, simDuration, formSettings]);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-black text-red-600 uppercase tracking-wider">
            ADMINISTRATION & CONFIGURATION
          </p>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            System Settings & Configuration
          </h1>
          <p className="text-xs text-slate-700 font-medium">
            Define default interest rates, deduction rules, fee structures, and security configurations.
          </p>
        </div>
      </div>

      {/* Notification Toast */}
      {notificationMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span className="font-semibold">{notificationMsg}</span>
          </div>
          <button
            onClick={() => setNotificationMsg("")}
            className="text-emerald-500 hover:text-emerald-700 font-bold"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab("rules")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === "rules"
              ? "bg-red-600 text-white shadow-xs"
              : "text-slate-700 hover:text-slate-950 hover:bg-slate-100"
          }`}
        >
          <Sliders size={15} /> Financial Rules & Rates
        </button>
        <button
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === "security"
              ? "bg-red-600 text-white shadow-xs"
              : "text-slate-700 hover:text-slate-950 hover:bg-slate-100"
          }`}
        >
          <ShieldCheck size={15} /> Security & System Audit
        </button>
      </div>

      {/* TAB 1: FINANCIAL RULES & POLICIES */}
      {activeTab === "rules" && (
        <div className="space-y-6">
          <form onSubmit={handleSaveSettings} className="space-y-6">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 text-xs text-slate-700 font-semibold">
                <AlertCircle size={15} className="text-red-600 shrink-0" />
                <span>
                  Adjusting these parameters sets the default baseline for new loan approvals across all branches.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition cursor-pointer"
                >
                  <RotateCcw size={14} className="text-slate-700" />
                  <span>Reset Defaults</span>
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md shadow-red-600/25 transition cursor-pointer"
                >
                  <Save size={14} className="text-white shrink-0" />
                  <span className="text-white font-bold">Save Configuration</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Interest & Deduction Parameters */}
              <div className="lg:col-span-2 space-y-6">
                {/* Panel 1: Interest Rate Parameters */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                      <Percent size={18} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        Default Interest Rate Rules
                      </h2>
                      <p className="text-[11px] text-slate-600 font-medium">
                        Baseline rates applied to loan calculations according to payment frequency.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Monthly Interest Rate (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={formSettings.defaultMonthlyRate}
                          onChange={(e) =>
                            setFormSettings({
                              ...formSettings,
                              defaultMonthlyRate: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold"
                          required
                        />
                        <span className="absolute right-3 top-2 text-xs text-slate-600 font-bold">
                          % / mo
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-600 font-medium">Default for monthly installment products.</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Weekly Interest Rate (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={formSettings.defaultWeeklyRate}
                          onChange={(e) =>
                            setFormSettings({
                              ...formSettings,
                              defaultWeeklyRate: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold"
                          required
                        />
                        <span className="absolute right-3 top-2 text-xs text-slate-600 font-bold">
                          % / wk
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-600 font-medium">Default for micro weekly lending.</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Daily Interest Rate (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={formSettings.defaultDailyRate}
                          onChange={(e) =>
                            setFormSettings({
                              ...formSettings,
                              defaultDailyRate: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold"
                          required
                        />
                        <span className="absolute right-3 top-2 text-xs text-slate-600 font-bold">
                          % / day
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-600 font-medium">Default for short-term daily merchant loans.</p>
                    </div>
                  </div>
                </div>

                {/* Panel 2: Deduction Rules & Upfront Charges */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                      <DollarSign size={18} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        Deduction & Disbursement Policies
                      </h2>
                      <p className="text-[11px] text-slate-600 font-medium">
                        Rules governing upfront capital deductions, service fees, and interest deduction mechanics.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Capital Deduction Rate (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="50"
                          value={formSettings.defaultCapitalDeductionRate}
                          onChange={(e) =>
                            setFormSettings({
                              ...formSettings,
                              defaultCapitalDeductionRate: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold"
                          required
                        />
                        <span className="absolute right-3 top-2 text-xs text-slate-600 font-bold">
                          %
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-600 font-medium">
                        Withheld at disbursement towards capital reserve / security deposit.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Interest Deduction Method
                      </label>
                      <select
                        value={formSettings.defaultInterestDeductionMethod}
                        onChange={(e) =>
                          setFormSettings({
                            ...formSettings,
                            defaultInterestDeductionMethod: e.target.value as
                              | "UPFRONT"
                              | "COLLECTED_VIA_INSTALLMENTS",
                          })
                        }
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold bg-white"
                      >
                        <option value="UPFRONT">Upfront Deduction (Deduct at disbursement)</option>
                        <option value="COLLECTED_VIA_INSTALLMENTS">
                          Installment Distributed (Collect with periodic dues)
                        </option>
                      </select>
                      <p className="text-[10px] text-slate-600 font-medium">
                        Governs whether borrower receives Principal minus Interest upfront.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Default Processing Fee (LKR)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={formSettings.defaultProcessingFee}
                        onChange={(e) =>
                          setFormSettings({
                            ...formSettings,
                            defaultProcessingFee: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold"
                        required
                      />
                      <p className="text-[10px] text-slate-600 font-medium">
                        Documentation, loan verification, and credit assessment fee.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Default Administrative / Legal Fee (LKR)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={formSettings.defaultAdminFee}
                        onChange={(e) =>
                          setFormSettings({
                            ...formSettings,
                            defaultAdminFee: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold"
                        required
                      />
                      <p className="text-[10px] text-slate-600 font-medium">
                        Stamp duty, notary verification, and account ledger creation fee.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Panel 3: Delinquency & Penalty Configuration */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                      <AlertCircle size={18} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        Late Repayment & Delinquency Rules
                      </h2>
                      <p className="text-[11px] text-slate-600 font-medium">
                        Standard penalties applied when customer repayments exceed their due dates.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Late Repayment Penalty Rate (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="20"
                          value={formSettings.lateFeePercentage}
                          onChange={(e) =>
                            setFormSettings({
                              ...formSettings,
                              lateFeePercentage: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold"
                          required
                        />
                        <span className="absolute right-3 top-2 text-xs text-slate-600 font-bold">
                          % / cycle
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-600 font-medium">
                        Calculated as a percentage of overdue installment value.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Grace Period (Days)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        value={formSettings.gracePeriodDays}
                        onChange={(e) =>
                          setFormSettings({
                            ...formSettings,
                            gracePeriodDays: parseInt(e.target.value, 10) || 0,
                          })
                        }
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold"
                        required
                      />
                      <p className="text-[10px] text-slate-600 font-medium">
                        Buffer period granted before an unpaid loan triggers Overdue status.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Panel 4: System Identity */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                      <Building size={18} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        System Identity & Currency
                      </h2>
                      <p className="text-[11px] text-slate-600 font-medium">
                        Platform branding and default monetary denomination.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        System Name
                      </label>
                      <input
                        type="text"
                        value={formSettings.systemName}
                        onChange={(e) =>
                          setFormSettings({ ...formSettings, systemName: e.target.value })
                        }
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Operating Currency
                      </label>
                      <select
                        value={formSettings.currency}
                        onChange={(e) =>
                          setFormSettings({ ...formSettings, currency: e.target.value })
                        }
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold bg-white"
                      >
                        <option value="LKR">LKR (Sri Lankan Rupee - Rs.)</option>
                        <option value="USD">USD (United States Dollar - $)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Calculation Simulator */}
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-black via-[#200308] to-[#3a0610] border border-red-950 p-6 rounded-2xl text-white shadow-lg space-y-5 sticky top-6">
                  <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
                    <div className="flex items-center gap-2">
                      <Calculator size={18} className="text-rose-400" />
                      <h3 className="text-sm font-bold tracking-tight">
                        Live Policy Simulation
                      </h3>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-rose-300 font-semibold border border-red-500/30">
                      Real-time
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-200 font-medium leading-relaxed">
                    Test your configured parameters on an example loan to verify cash flow and disbursement mechanics before saving.
                  </p>

                  <div className="space-y-3 bg-white/5 p-4 rounded-xl border border-white/10 text-xs">
                    <div>
                      <label className="text-[11px] font-bold text-white block mb-1">
                        Test Loan Principal
                      </label>
                      <input
                        type="number"
                        step="10000"
                        value={simPrincipal}
                        onChange={(e) => setSimPrincipal(parseFloat(e.target.value) || 0)}
                        className="w-full px-3.5 py-2 text-xs bg-white text-slate-950 font-mono font-bold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-xs"
                        style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-white block mb-1">
                        Loan Duration (Months)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="36"
                        value={simDuration}
                        onChange={(e) => setSimDuration(parseInt(e.target.value, 10) || 1)}
                        className="w-full px-3.5 py-2 text-xs bg-white text-slate-950 font-mono font-bold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-xs"
                        style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                      />
                    </div>
                  </div>

                  {/* Computed Results */}
                  <div className="space-y-2 text-xs border-t border-slate-700/80 pt-3">
                    <div className="flex justify-between text-slate-200 font-medium">
                      <span>Total Interest ({formSettings.defaultMonthlyRate}% x {simDuration} mo)</span>
                      <span className="font-mono font-bold text-white">
                        {MONEY(simCalculations.totalInterest)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-200 font-medium">
                      <span>Capital Deduction ({formSettings.defaultCapitalDeductionRate}%)</span>
                      <span className="font-mono font-bold text-white">
                        -{MONEY(simCalculations.capitalDeduction)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-200 font-medium">
                      <span>Processing & Admin Fees</span>
                      <span className="font-mono font-bold text-white">
                        -{MONEY(simCalculations.processingFee + simCalculations.adminFee)}
                      </span>
                    </div>
                    {formSettings.defaultInterestDeductionMethod === "UPFRONT" && (
                      <div className="flex justify-between text-amber-300 text-[11px] font-medium">
                        <span>Interest Withheld Upfront</span>
                        <span className="font-mono font-bold">
                          -{MONEY(simCalculations.totalInterest)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Summary Callouts */}
                  <div className="space-y-2.5 pt-2">
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                      <p className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">
                        Borrower Disbursed Cash
                      </p>
                      <p className="text-xl font-black font-mono text-emerald-300">
                        {MONEY(simCalculations.netDisbursement)}
                      </p>
                    </div>

                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <p className="text-[10px] text-rose-400 uppercase font-bold tracking-wider">
                        Total Repayment Due
                      </p>
                      <p className="text-xl font-black font-mono text-rose-300">
                        {MONEY(simCalculations.totalRepayment)}
                      </p>
                      <p className="text-[10px] text-slate-300 font-medium mt-1">
                        Monthly Installment: <span className="font-bold text-white font-mono">{MONEY(simCalculations.monthlyInstallment)}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-red-600/25 cursor-pointer"
                  >
                    <Save size={14} className="text-white shrink-0" />
                    <span className="text-white font-bold">Commit Settings</span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: SECURITY & SYSTEM AUDIT */}
      {activeTab === "security" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Security Policies */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Authentication & Access Control</h3>
                  <p className="text-[11px] text-slate-600 font-medium">Session policies and security restrictions.</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <p className="font-bold text-slate-900">Two-Factor Authentication (2FA)</p>
                    <p className="text-[11px] text-slate-600 font-medium">Enforce OTP verification on administrative actions</p>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[11px] border border-emerald-300">
                    Enforced
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <p className="font-bold text-slate-900">Idle Session Inactivity Timeout</p>
                    <p className="text-[11px] text-slate-600 font-medium">Auto logout after consecutive inactivity</p>
                  </div>
                  <span className="font-mono font-bold text-slate-900 bg-white px-2 py-1 rounded border border-slate-300">
                    30 Minutes
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <p className="font-bold text-slate-900">Password Complexity Policy</p>
                    <p className="text-[11px] text-slate-600 font-medium">Min 8 chars, alphanumeric & symbol required</p>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[11px] border border-emerald-300">
                    Active
                  </span>
                </div>
              </div>
            </div>

            {/* Audit & Backup Policy */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                  <Lock size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">System Integrity & Backups</h3>
                  <p className="text-[11px] text-slate-600 font-medium">Database snapshot cycles and compliance logging.</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <p className="font-bold text-slate-900">Automated Daily Database Snapshots</p>
                    <p className="text-[11px] text-slate-600 font-medium">Encrypted backup saved to secure cloud bucket</p>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[11px] border border-emerald-300">
                    Operational
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <p className="font-bold text-slate-900">Audit Trail Retention</p>
                    <p className="text-[11px] text-slate-600 font-medium">Financial modification and payment record logs</p>
                  </div>
                  <span className="font-mono font-bold text-slate-900 bg-white px-2 py-1 rounded border border-slate-300">
                    180 Days
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <p className="font-bold text-slate-900">System Build Specification</p>
                    <p className="text-[11px] text-slate-600 font-medium">Next.js App Router • Production Edition</p>
                  </div>
                  <span className="font-mono font-bold text-red-800 bg-red-50 px-2 py-1 rounded border border-red-300">
                    v2.4.0
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 max-w-7xl mx-auto text-xs text-slate-400">
          Loading system settings...
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
