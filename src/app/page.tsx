"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useData } from "@/providers/data-provider";
import type { Customer, Loan, Payment } from "@/types";

type ActiveTab =
  | "dashboard"
  | "customers"
  | "loans"
  | "new-loan"
  | "repayments"
  | "reports"
  | "settings";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const { customers, loans, payments, addCustomer, addLoan } = useData();

  // Form states for quick actions
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  const [loanCustomer, setLoanCustomer] = useState("");

  // Metrics
  const totalDisbursed = loans.reduce((acc: number, l: Loan) => acc + (Number(l.principal || l.amount) || 0), 0);
  const totalCollections = payments.reduce((acc: number, p: Payment) => acc + (Number(p.amount) || 0), 0);
  const pendingApprovals = loans.filter((l: Loan) => (l.status || "").toLowerCase() === "pending").length;

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans text-slate-800">
      {/* ================= SINGLE SIDEBAR ================= */}
      <aside className="w-64 bg-[#0d1527] text-slate-300 flex flex-col shrink-0 shadow-2xl border-r border-slate-800">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-base shadow-lg shadow-blue-500/30">
            PSI
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">PSI One LMS</h1>
            <p className="text-[11px] text-slate-400">Loan Management System</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3.5 space-y-1.5 overflow-y-auto text-sm">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl font-medium transition ${
              activeTab === "dashboard"
                ? "bg-blue-600 text-white shadow-md font-semibold"
                : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
            }`}
          >
            <span>🏠</span>
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab("customers")}
            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl font-medium transition ${
              activeTab === "customers"
                ? "bg-blue-600 text-white shadow-md font-semibold"
                : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
            }`}
          >
            <span>👥</span>
            <span>Customer Directory</span>
          </button>

          <button
            onClick={() => setActiveTab("loans")}
            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl font-medium transition ${
              activeTab === "loans"
                ? "bg-blue-600 text-white shadow-md font-semibold"
                : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
            }`}
          >
            <span>💳</span>
            <span>Loans List</span>
          </button>

          <button
            onClick={() => setActiveTab("new-loan")}
            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl font-medium transition ${
              activeTab === "new-loan"
                ? "bg-blue-600 text-white shadow-md font-semibold"
                : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
            }`}
          >
            <span>💰</span>
            <span>Issue New Loan</span>
          </button>

          <button
            onClick={() => setActiveTab("repayments")}
            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl font-medium transition ${
              activeTab === "repayments"
                ? "bg-blue-600 text-white shadow-md font-semibold"
                : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
            }`}
          >
            <span>📊</span>
            <span>Daily Collections</span>
          </button>

          <button
            onClick={() => setActiveTab("reports")}
            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl font-medium transition ${
              activeTab === "reports"
                ? "bg-blue-600 text-white shadow-md font-semibold"
                : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
            }`}
          >
            <span>📈</span>
            <span>Reports & Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl font-medium transition ${
              activeTab === "settings"
                ? "bg-blue-600 text-white shadow-md font-semibold"
                : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
            }`}
          >
            <span>⚙️</span>
            <span>System Settings</span>
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between px-3 py-2 bg-slate-800/60 rounded-xl text-xs font-semibold text-slate-300">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>System Status</span>
            </div>
            <span className="text-emerald-400 font-bold">ONLINE</span>
          </div>

          <Link
            href="/login"
            className="flex items-center justify-center w-full px-3 py-2 text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-slate-800/60 rounded-lg transition"
          >
            ← Sign Out
          </Link>
        </div>
      </aside>

      {/* ================= MAIN CONTENT AREA ================= */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shadow-xs z-10">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              PSI One Loan Management Portal
            </h2>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-xs font-bold text-slate-800">Admin Officer</p>
              <p className="text-[11px] text-slate-500">Loan Department</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
              AD
            </div>
          </div>
        </header>

        {/* Main Body */}
        <main className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50">
          {/* TAB 1: DASHBOARD VIEW */}
          {activeTab === "dashboard" && (
            <>
              {/* Blue Hero Banner */}
              <div className="rounded-2xl bg-gradient-to-r from-[#0d1b3e] via-[#102454] to-[#152e6b] text-white p-7 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="max-w-2xl space-y-2">
                  <span className="inline-block px-3 py-1 bg-blue-500/20 text-blue-300 text-xs font-semibold rounded-full border border-blue-400/20">
                    PSI One Core System
                  </span>
                  <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                    Loan Management Dashboard
                  </h2>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Streamline customer registrations, track capital & interest deductions, manage loan disbursements, and monitor real-time collections effortlessly.
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => setActiveTab("new-loan")}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-600/30 transition cursor-pointer"
                  >
                    + Issue New Loan
                  </button>
                  <button
                    onClick={() => setActiveTab("reports")}
                    className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-xl backdrop-blur-md transition cursor-pointer"
                  >
                    View Reports
                  </button>
                </div>
              </div>

              {/* 4 Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Stat 1 */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      TOTAL ACTIVE PORTFOLIO
                    </span>
                    <span className="p-2 bg-blue-50 rounded-xl text-blue-600 text-sm">📈</span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-2xl font-black text-slate-900">
                      LKR {totalDisbursed ? totalDisbursed.toLocaleString() : "14,850,000"}
                    </h3>
                    <p className="text-xs font-semibold text-emerald-600 mt-1 flex items-center gap-1">
                      <span>+12.5%</span> <span className="text-slate-400 font-normal">from last month</span>
                    </p>
                  </div>
                </div>

                {/* Stat 2 */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      TODAY&apos;S COLLECTIONS
                    </span>
                    <span className="p-2 bg-emerald-50 rounded-xl text-emerald-600 text-sm">💵</span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-2xl font-black text-slate-900">
                      LKR {totalCollections ? totalCollections.toLocaleString() : "425,300"}
                    </h3>
                    <p className="text-xs font-semibold text-emerald-600 mt-1">
                      98.2% <span className="text-slate-400 font-normal">collection efficiency</span>
                    </p>
                  </div>
                </div>

                {/* Stat 3 */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      REGISTERED CUSTOMERS
                    </span>
                    <span className="p-2 bg-purple-50 rounded-xl text-purple-600 text-sm">👥</span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-2xl font-black text-slate-900">
                      {customers?.length || "1,482"}
                    </h3>
                    <p className="text-xs font-semibold text-purple-600 mt-1">
                      +24 <span className="text-slate-400 font-normal">newly added today</span>
                    </p>
                  </div>
                </div>

                {/* Stat 4 */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      PENDING APPROVALS
                    </span>
                    <span className="p-2 bg-amber-50 rounded-xl text-amber-600 text-sm">⏳</span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-2xl font-black text-amber-600">
                      {pendingApprovals ? `${pendingApprovals} Loans` : "8 Loans"}
                    </h3>
                    <p className="text-xs font-bold text-amber-600 mt-1">
                      Requires Action
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Navigation & Recent Transactions */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Quick Navigation Card */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 space-y-4">
                  <h3 className="text-base font-bold text-slate-800">Quick Navigation</h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => setActiveTab("new-loan")}
                      className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-blue-50/80 border border-slate-200/80 hover:border-blue-300 rounded-xl font-medium text-sm text-slate-700 hover:text-blue-600 transition"
                    >
                      <div className="flex items-center gap-3">
                        <span>⚡</span>
                        <span>Create New Loan Wizard</span>
                      </div>
                      <span>→</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("customers")}
                      className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-blue-50/80 border border-slate-200/80 hover:border-blue-300 rounded-xl font-medium text-sm text-slate-700 hover:text-blue-600 transition"
                    >
                      <div className="flex items-center gap-3">
                        <span>👤</span>
                        <span>Register New Customer</span>
                      </div>
                      <span>→</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("repayments")}
                      className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-blue-50/80 border border-slate-200/80 hover:border-blue-300 rounded-xl font-medium text-sm text-slate-700 hover:text-blue-600 transition"
                    >
                      <div className="flex items-center gap-3">
                        <span>📊</span>
                        <span>Log Today&apos;s Collection</span>
                      </div>
                      <span>→</span>
                    </button>
                  </div>
                </div>

                {/* Recent Transactions Table */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-slate-800">Recent Loan Transactions</h3>
                    <button
                      onClick={() => setActiveTab("loans")}
                      className="text-xs font-semibold text-blue-600 hover:underline"
                    >
                      View All
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs text-slate-400 font-bold uppercase tracking-wider">
                          <th className="pb-3">Customer</th>
                          <th className="pb-3">Loan ID</th>
                          <th className="pb-3">Gross Amount</th>
                          <th className="pb-3">Frequency</th>
                          <th className="pb-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {(loans?.length ? loans.slice(0, 5) : [
                          { customerName: "K. A. Nimal Perera", loanNo: "LN-2026-001", amount: 100000, frequency: "Monthly", status: "Active" },
                          { customerName: "S. M. Bandara", loanNo: "LN-2026-002", amount: 250000, frequency: "Monthly", status: "Active" },
                          { customerName: "P. R. Fernando", loanNo: "LN-2026-003", amount: 75000, frequency: "Weekly", status: "Pending" },
                          { customerName: "T. D. Jayasuriya", loanNo: "LN-2026-004", amount: 500000, frequency: "Monthly", status: "Active" },
                        ]).map((loan, idx: number) => {
                          const l = loan as unknown as { customerName?: string; customer?: { name?: string }; loanNo?: string; amount?: number; principal?: number; frequency?: string; repaymentFrequency?: string; status?: string };
                          return (
                          <tr key={idx} className="hover:bg-slate-50/80">
                            <td className="py-3.5 font-medium text-slate-900">{l.customerName || l.customer?.name || "Customer " + (idx + 1)}</td>
                            <td className="py-3.5 text-xs text-slate-500">{l.loanNo || `LN-2026-${String(idx + 1).padStart(3, "0")}`}</td>
                            <td className="py-3.5 font-semibold text-slate-900">LKR {Number(l.amount || l.principal || 0).toLocaleString()}</td>
                            <td className="py-3.5 text-xs text-slate-500">{l.frequency || l.repaymentFrequency || "Monthly"}</td>
                            <td className="py-3.5">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                (l.status || "").toLowerCase() === "pending"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}>
                                {l.status || "Active"}
                              </span>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: ISSUE NEW LOAN */}
          {activeTab === "new-loan" && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200/80 max-w-2xl">
              <h3 className="text-xl font-bold text-slate-900 mb-6">Issue New Loan</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!loanCustomer || !loanAmount) return;
                  const numAmount = Number(loanAmount);
                  addLoan({
                    id: String(Date.now()),
                    customerId: `CUST-${Date.now().toString().slice(-4)}`,
                    customerName: loanCustomer,
                    amount: numAmount,
                    principal: numAmount,
                    capitalDeduction: 0,
                    interestDeduction: 0,
                    otherFees: 0,
                    interestRate: 3,
                    ratePeriod: "Monthly",
                    repaymentFrequency: "Monthly",
                    duration: 12,
                    issueDate: new Date().toISOString().slice(0, 10),
                    firstPaymentDate: new Date().toISOString().slice(0, 10),
                    status: "Active",
                    interest: (numAmount * 3) / 100,
                    totalRepayment: numAmount + (numAmount * 3) / 100,
                    netDisbursement: numAmount,
                    installment: (numAmount + (numAmount * 3) / 100) / 12,
                    loanNo: `LN-${Date.now().toString().slice(-4)}`,
                  });
                  setLoanAmount("");
                  setLoanCustomer("");
                  setActiveTab("loans");
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Customer Name</label>
                  <input
                    type="text"
                    required
                    value={loanCustomer}
                    onChange={(e) => setLoanCustomer(e.target.value)}
                    placeholder="e.g. Sunil Shantha"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Loan Amount (LKR)</label>
                  <input
                    type="number"
                    required
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value)}
                    placeholder="e.g. 150000"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="pt-2 flex gap-3">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl shadow-md transition"
                  >
                    Disburse Loan
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("dashboard")}
                    className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: CUSTOMERS DIRECTORY */}
          {activeTab === "customers" && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200/80 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-900">Customer Directory</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="New customer name"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Phone"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                  <button
                    onClick={() => {
                      if (!newCustomerName) return;
                      addCustomer({
                        id: `CUST-${Date.now().toString().slice(-4)}`,
                        name: newCustomerName,
                        fullName: newCustomerName,
                        nic: "200012345678",
                        phone: newCustomerPhone || "0771234567",
                        address: "Colombo Road",
                        village: "Center",
                        town: "Colombo",
                        district: "Colombo",
                        monthlyIncome: 65000,
                        status: "Active",
                        registeredAt: new Date().toISOString().slice(0, 10),
                      });
                      setNewCustomerName("");
                      setNewCustomerPhone("");
                    }}
                    className="px-4 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-500"
                  >
                    + Add
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-xs text-slate-400 font-bold uppercase">
                      <th className="pb-3">Name</th>
                      <th className="pb-3">Phone</th>
                      <th className="pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(customers || []).map((c: Customer, i: number) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-3 font-medium text-slate-900">{c.name}</td>
                        <td className="py-3 text-slate-500">{c.phone || "N/A"}</td>
                        <td className="py-3">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                            Active
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: LOANS LIST */}
          {activeTab === "loans" && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200/80 space-y-6">
              <h3 className="text-xl font-bold text-slate-900">Active & Past Loans</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-xs text-slate-400 font-bold uppercase">
                      <th className="pb-3">Loan ID</th>
                      <th className="pb-3">Customer</th>
                      <th className="pb-3">Amount</th>
                      <th className="pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(loans || []).map((l: Loan, i: number) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-3 text-xs text-slate-500">{l.loanNo || l.id || `LN-${i + 1}`}</td>
                        <td className="py-3 font-medium text-slate-900">{l.customerName || (l as { customer?: { name?: string } }).customer?.name || "Customer"}</td>
                        <td className="py-3 font-semibold text-slate-900">LKR {Number(l.amount || l.principal || 0).toLocaleString()}</td>
                        <td className="py-3">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                            {l.status || "Active"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: DAILY COLLECTIONS */}
          {activeTab === "repayments" && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200/80 space-y-4">
              <h3 className="text-xl font-bold text-slate-900">Daily Collections Tracker</h3>
              <p className="text-sm text-slate-500">
                Track all installment repayments and collection officer receipts. Total collected: 
                <span className="font-bold text-slate-900 ml-1">LKR {totalCollections.toLocaleString()}</span>
              </p>
            </div>
          )}

          {/* TAB 6: REPORTS */}
          {activeTab === "reports" && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200/80 space-y-4">
              <h3 className="text-xl font-bold text-slate-900">Reports & Analytics</h3>
              <p className="text-sm text-slate-500">Summary reports, monthly recovery targets, and audit reports.</p>
            </div>
          )}

          {/* TAB 7: SETTINGS */}
          {activeTab === "settings" && (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200/80 space-y-4">
              <h3 className="text-xl font-bold text-slate-900">System Settings</h3>
              <p className="text-sm text-slate-500">Configure interest rates, branch locations, and staff permissions.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}