/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  UserPlus,
  ExternalLink,
  X,
  CheckCircle2,
  Users,
  UserCheck,
  UserX,
  FileText,
  Phone,
  MapPin,
  Briefcase,
  CreditCard,
  History,
  DollarSign,
} from "lucide-react";
import { useData } from "@/providers/data-provider";
import { MONEY } from "@/constants";
import type { Customer, Loan, Payment, CustomerDocument } from "@/types";

export default function CustomersPage() {
  const router = useRouter();
  const { customers, loans, payments, documents } = useData();

  const [search, setSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // ─── Filtered list ────────────────────────────────────────────────────────
  const filteredCustomers = useMemo(
    () =>
      customers.filter((c: Customer) =>
        [c.id, c.name, c.fullName, c.phone, c.nic, c.town, c.village, c.district]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [customers, search]
  );

  // ─── Selected customer data ───────────────────────────────────────────────
  const selectedCustomer = useMemo(
    () => (selectedCustomerId ? customers.find((c: Customer) => c.id === selectedCustomerId) ?? null : null),
    [customers, selectedCustomerId]
  );

  const selectedLoans = useMemo(
    () => (selectedCustomer ? loans.filter((l: Loan) => l.customerId === selectedCustomer.id) : []),
    [loans, selectedCustomer]
  );

  const selectedPayments = useMemo(() => {
    if (!selectedCustomer) return [];
    const loanIds = selectedLoans.map((l) => l.id);
    return payments.filter(
      (p: Payment) => p.customerId === selectedCustomer.id || loanIds.includes(p.loanId)
    );
  }, [payments, selectedCustomer, selectedLoans]);

  const selectedDocs = useMemo(
    () => (selectedCustomer ? documents.filter((d: CustomerDocument) => d.customerId === selectedCustomer.id) : []),
    [documents, selectedCustomer]
  );

  const totalRepayable = selectedLoans.reduce((s, l) => s + (l.totalRepayment || 0), 0);
  const totalPaid = selectedPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const outstanding = Math.max(0, totalRepayable - totalPaid);

  // ─── Summary counts ───────────────────────────────────────────────────────
  const activeCount = customers.filter(
    (c: Customer) => (c.status || "").toUpperCase() === "ACTIVE"
  ).length;
  const inactiveCount = customers.length - activeCount;

  return (
    <main className="min-h-screen bg-slate-50">
      {/* ═══ Page Header ══════════════════════════════════════════════════════ */}
      <div className="bg-white border-b border-slate-200 px-8 py-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest">
              PSI ONE · LOAN MANAGEMENT
            </p>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              Customer Directory
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage customer profiles, identity documents, and active loan portfolios
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, NIC, ID, town…"
                className="pl-8 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl w-64 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>

            {/* ADD CUSTOMER — navigates to /customers/new */}
            <button
              type="button"
              onClick={() => router.push("/customers/new")}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/25 transition cursor-pointer"
            >
              <UserPlus size={14} />
              Add Customer
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8 space-y-6">
        {/* ═══ Summary Cards ═══════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Users size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Total Customers
              </p>
              <p className="text-2xl font-black text-slate-900">{customers.length}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <UserCheck size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Active Borrowers
              </p>
              <p className="text-2xl font-black text-slate-900">{activeCount}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
              <UserX size={18} className="text-rose-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Inactive / Suspended
              </p>
              <p className="text-2xl font-black text-slate-900">{inactiveCount}</p>
            </div>
          </div>
        </div>

        {/* ═══ Customer Table ═══════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-5 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                    Customer
                  </th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                    Customer ID
                  </th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                    Contact Phone
                  </th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                    NIC Number
                  </th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                    Town / District
                  </th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                    Status
                  </th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((customer: Customer) => {
                  const displayName = customer.fullName || customer.name || "Unknown";
                  const initials = displayName
                    .split(" ")
                    .map((p: string) => p[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();
                  const isActive = (customer.status || "").toUpperCase() === "ACTIVE";

                  return (
                    <tr
                      key={customer.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Customer avatar + name */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {customer.photoUrl ? (
                            <img
                              src={customer.photoUrl}
                              alt=""
                              className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <span className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 text-[11px] font-extrabold flex items-center justify-center shrink-0">
                              {initials}
                            </span>
                          )}
                          <div>
                            <p className="font-bold text-slate-900 text-sm leading-tight">
                              {displayName}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {customer.occupation || "—"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {customer.id}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-sm text-slate-800 font-medium">
                        {customer.phone}
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs font-semibold text-slate-800">
                          {customer.nic || "—"}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-sm text-slate-700">
                        {customer.town || "—"}
                        {customer.district ? `, ${customer.district}` : ""}
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isActive
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {customer.status}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedCustomerId(customer.id)}
                            className="px-3 py-1.5 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition cursor-pointer"
                          >
                            View Details
                          </button>
                          <Link
                            href={`/customers/${customer.id}`}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
                            title="Open full profile page"
                          >
                            <ExternalLink size={13} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Users size={32} className="text-slate-300" />
                        <p className="text-sm font-semibold text-slate-500">
                          No customers found
                        </p>
                        <p className="text-xs text-slate-400">
                          {search
                            ? `No results for "${search}". Try a different search.`
                            : "No customers registered yet."}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* CUSTOMER PROFILE MODAL (VIEW DETAILS)                                  */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {selectedCustomer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelectedCustomerId(null);
          }}
        >
          <div
            className="bg-white w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-modal-title"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between px-7 pt-6 pb-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-3xl z-10">
              <div>
                <p className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest">
                  CUSTOMER PROFILE OVERVIEW
                </p>
                <h2
                  id="profile-modal-title"
                  className="text-xl font-black text-slate-900 mt-0.5"
                >
                  {selectedCustomer.fullName || selectedCustomer.name}
                </h2>
                <p className="text-xs font-mono text-slate-500 mt-0.5">
                  {selectedCustomer.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomerId(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer mt-1"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-7 py-6 space-y-6">
              {/* ── Photo + Quick Info ────────────────────────────────────── */}
              <div className="flex items-center gap-5">
                {selectedCustomer.photoUrl ? (
                  <img
                    src={selectedCustomer.photoUrl}
                    alt={selectedCustomer.name}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-blue-200 shadow-md shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-blue-100 text-blue-700 font-black text-2xl flex items-center justify-center shrink-0">
                    {(selectedCustomer.name || "C").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="space-y-1.5">
                  <h3 className="text-lg font-black text-slate-900 leading-tight">
                    {selectedCustomer.fullName || selectedCustomer.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                      {selectedCustomer.id}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        (selectedCustomer.status || "").toUpperCase() === "ACTIVE"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {selectedCustomer.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Outstanding Balance Banner ────────────────────────────── */}
              <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">
                    Current Outstanding Balance
                  </p>
                  <p className="text-2xl font-black font-mono mt-1">
                    {MONEY(outstanding)}
                  </p>
                </div>
                <div className="text-right text-xs space-y-1">
                  <p className="text-slate-400">
                    Total Repayable:{" "}
                    <span className="text-white font-bold">{MONEY(totalRepayable)}</span>
                  </p>
                  <p className="text-emerald-400 font-bold">Paid: {MONEY(totalPaid)}</p>
                </div>
              </div>

              {/* ── Personal & Contact Info ───────────────────────────────── */}
              <section>
                <ProfileSectionTitle icon={<CreditCard size={14} />} label="Personal Identity" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <ProfileRow label="Full Name" value={selectedCustomer.fullName || selectedCustomer.name} />
                  <ProfileRow label="NIC Number" value={selectedCustomer.nic} mono />
                  <ProfileRow label="Customer ID" value={selectedCustomer.id} mono />
                  <ProfileRow label="Customer Status" value={selectedCustomer.status} />
                </div>
              </section>

              <section>
                <ProfileSectionTitle icon={<Phone size={14} />} label="Contact Information" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <ProfileRow label="Primary Phone" value={selectedCustomer.phone} />
                  <ProfileRow label="Alternative Phone" value={selectedCustomer.alternatePhone || "—"} />
                  <ProfileRow label="Email" value={selectedCustomer.email || "—"} />
                </div>
              </section>

              <section>
                <ProfileSectionTitle icon={<MapPin size={14} />} label="Residential Address" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <ProfileRow label="Address" value={selectedCustomer.address} fullWidth />
                  <ProfileRow label="Village" value={selectedCustomer.village || "—"} />
                  <ProfileRow label="Town" value={selectedCustomer.town || "—"} />
                  <ProfileRow label="District" value={selectedCustomer.district || "—"} />
                </div>
              </section>

              <section>
                <ProfileSectionTitle icon={<Briefcase size={14} />} label="Occupation & Income" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <ProfileRow label="Occupation" value={selectedCustomer.occupation || "—"} />
                  <ProfileRow
                    label="Monthly Income"
                    value={selectedCustomer.monthlyIncome ? MONEY(selectedCustomer.monthlyIncome) : "—"}
                  />
                </div>
              </section>

              {/* ── Uploaded Identity Documents ───────────────────────────── */}
              <section>
                <ProfileSectionTitle icon={<FileText size={14} />} label={`Uploaded Documents (${selectedDocs.length})`} />
                <div className="mt-3 space-y-2">
                  {selectedDocs.length > 0 ? (
                    selectedDocs.map((doc: CustomerDocument) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-800">{doc.title}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {doc.fileName} · {doc.fileSize} ·{" "}
                            <span className="uppercase">{doc.type.replace(/_/g, " ")}</span>
                          </p>
                        </div>
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 text-blue-700 bg-blue-50 hover:bg-blue-100 font-bold rounded-lg transition"
                        >
                          View
                        </a>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      No identity documents attached to this profile.
                    </p>
                  )}
                </div>
              </section>

              {/* ── Existing Loans ─────────────────────────────────────────── */}
              <section>
                <ProfileSectionTitle icon={<DollarSign size={14} />} label={`Existing Loans (${selectedLoans.length})`} />
                <div className="mt-3">
                  {selectedLoans.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="text-left px-4 py-2.5 font-bold text-slate-600">Loan ID</th>
                            <th className="text-left px-4 py-2.5 font-bold text-slate-600">Purpose</th>
                            <th className="text-left px-4 py-2.5 font-bold text-slate-600">Principal</th>
                            <th className="text-left px-4 py-2.5 font-bold text-slate-600">Total Due</th>
                            <th className="text-left px-4 py-2.5 font-bold text-slate-600">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedLoans.map((loan: Loan) => (
                            <tr key={loan.id} className="hover:bg-slate-50/60">
                              <td className="px-4 py-2.5 font-mono font-bold text-slate-800">
                                {loan.loanNo || loan.id}
                              </td>
                              <td className="px-4 py-2.5 text-slate-700">
                                {loan.purpose || "Loan Facility"}
                              </td>
                              <td className="px-4 py-2.5 font-mono text-slate-800">
                                {MONEY(loan.principal || loan.amount || 0)}
                              </td>
                              <td className="px-4 py-2.5 font-mono font-bold text-slate-900">
                                {MONEY(loan.totalRepayment || 0)}
                              </td>
                              <td className="px-4 py-2.5">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    loan.status.toLowerCase() === "active"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : loan.status.toLowerCase() === "overdue"
                                      ? "bg-rose-100 text-rose-700"
                                      : "bg-slate-200 text-slate-600"
                                  }`}
                                >
                                  {loan.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No loans recorded for this customer.</p>
                  )}
                </div>
              </section>

              {/* ── Repayment History ──────────────────────────────────────── */}
              <section>
                <ProfileSectionTitle icon={<History size={14} />} label={`Repayment History (${selectedPayments.length} records)`} />
                {selectedCustomer.priorRepaymentHistory && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
                    <strong>Prior track record:</strong> {selectedCustomer.priorRepaymentHistory}
                  </div>
                )}
                <div className="mt-3">
                  {selectedPayments.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="text-left px-4 py-2.5 font-bold text-slate-600">Date</th>
                            <th className="text-left px-4 py-2.5 font-bold text-slate-600">Receipt No</th>
                            <th className="text-left px-4 py-2.5 font-bold text-slate-600">Type</th>
                            <th className="text-left px-4 py-2.5 font-bold text-slate-600">Amount</th>
                            <th className="text-left px-4 py-2.5 font-bold text-slate-600">Method</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedPayments.map((p: Payment) => (
                            <tr key={p.id} className="hover:bg-slate-50/60">
                              <td className="px-4 py-2.5 font-mono text-slate-700">{p.date}</td>
                              <td className="px-4 py-2.5 font-mono font-bold text-blue-700">
                                {p.receiptNo || p.id}
                              </td>
                              <td className="px-4 py-2.5 text-slate-700">{p.type}</td>
                              <td className="px-4 py-2.5 font-mono font-bold text-slate-900">
                                {MONEY(p.amount)}
                              </td>
                              <td className="px-4 py-2.5 text-slate-600">{p.method || "Cash"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic mt-2">
                      {selectedCustomer.priorRepaymentHistory
                        ? "No recent receipts recorded beyond onboarding history."
                        : "No repayment records found."}
                    </p>
                  )}
                </div>
              </section>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-slate-100 px-7 py-4 flex items-center justify-between rounded-b-3xl">
              <Link
                href={`/customers/${selectedCustomer.id}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 transition"
              >
                Open Full Profile <ExternalLink size={13} />
              </Link>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <button
                  type="button"
                  onClick={() => setSelectedCustomerId(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// ─── Small helper components ──────────────────────────────────────────────────
function ProfileSectionTitle({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
      <span className="text-blue-600">{icon}</span>
      <h4 className="text-[10px] font-extrabold text-slate-700 uppercase tracking-widest">
        {label}
      </h4>
    </div>
  );
}

function ProfileRow({
  label,
  value,
  mono,
  fullWidth,
}: {
  label: string;
  value: string;
  mono?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <div className={`${fullWidth ? "sm:col-span-2" : ""} bg-slate-50 rounded-xl p-3 border border-slate-100`}>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-bold text-slate-900 mt-0.5 ${mono ? "font-mono" : ""}`}>
        {value || "—"}
      </p>
    </div>
  );
}
