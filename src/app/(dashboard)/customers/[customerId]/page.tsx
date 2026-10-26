/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, Suspense, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  FileText,
  Upload,
  Download,
  Eye,
  Trash2,
  CheckCircle,
  Phone,
  ShieldCheck,
  User,
  X,
  History,
  Edit,
  Receipt,
  ArrowUpRight,
} from "lucide-react";
import { useData } from "@/providers/data-provider";
import { MONEY } from "@/constants";
import { ReceiptModal } from "@/components/modals/ReceiptModal";
import type { Customer, Loan, Payment, CustomerDocument } from "@/types";
import { getLoanTotalRepayment } from "@/lib/loan-financials";

function createDocId(): string {
  return `DOC-${Date.now()}`;
}

function getUploadDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function CustomerDetailsContent() {
  const params = useParams<{ customerId?: string; id?: string }>();
  const customerId = params?.customerId || params?.id;
  const { customers, loans, payments, documents, addDocument, deleteDocument } = useData();

  const customer = customers.find((x: Customer) => x.id === customerId);

  // Document modal & upload state
  const [selectedDocForPreview, setSelectedDocForPreview] = useState<CustomerDocument | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadType, setUploadType] = useState<CustomerDocument["type"]>("other");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [selectedFileUrl, setSelectedFileUrl] = useState("");
  const [selectedFileType, setSelectedFileType] = useState("image/jpeg");
  const [selectedFileSize, setSelectedFileSize] = useState("1.1 MB");
  const [notificationMsg, setNotificationMsg] = useState("");
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState<Payment | null>(null);

  // Loans linked to this customer
  const customerLoans = useMemo(
    () => (customerId ? loans.filter((l: Loan) => l.customerId === customerId) : []),
    [loans, customerId]
  );
  const customerLoanIds = useMemo(() => customerLoans.map((l) => l.id), [customerLoans]);

  // All repayments recorded for this customer
  const customerPayments = useMemo(() => {
    if (!customerId) return [];
    return payments.filter(
      (p: Payment) => p.customerId === customerId || customerLoanIds.includes(p.loanId)
    );
  }, [payments, customerId, customerLoanIds]);

  // Documents attached to this customer
  const customerDocs = useMemo(
    () => (customerId ? documents.filter((d: CustomerDocument) => d.customerId === customerId) : []),
    [documents, customerId]
  );

  // Aggregate financial metrics
  const totalBorrowed = useMemo(
    () => customerLoans.reduce((sum, l) => sum + (l.principal || l.amount || 0), 0),
    [customerLoans]
  );

  const totalRepayable = useMemo(
    () => customerLoans.reduce((sum, l) => sum + getLoanTotalRepayment(l), 0),
    [customerLoans]
  );

  const totalPaid = useMemo(
    () => customerPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    [customerPayments]
  );

  if (!customer) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-4">
        <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-2xl border border-slate-200 text-center space-y-4">
          <h2 className="text-xl font-semibold text-slate-800">Customer Not Found</h2>
          <p className="text-xs text-slate-500">
            The customer identifier &quot;{customerId}&quot; does not exist in the system records.
          </p>
          <div>
            <Link
              href="/customers"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-500 transition"
            >
              <ArrowLeft size={14} /> Back to Customer Directory
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentOutstandingBalance = Math.max(0, totalRepayable - totalPaid);

  const paymentCompletionRate =
    totalRepayable > 0 ? Math.min(100, Math.round((totalPaid / totalRepayable) * 100)) : 0;

  // Handle local file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
      setSelectedFileType(file.type || "application/pdf");
      setSelectedFileSize(`${(file.size / (1024 * 1024)).toFixed(2)} MB`);

      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedFileUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim()) return;

    const newDoc: CustomerDocument = {
      id: createDocId(),
      customerId: customer.id,
      title: uploadTitle.trim(),
      type: uploadType,
      fileName: selectedFileName || `${uploadTitle.toLowerCase().replace(/\s+/g, "_")}.pdf`,
      fileSize: selectedFileSize || "1.2 MB",
      fileType:
        selectedFileType ||
        (uploadType === "photo" || uploadType.startsWith("nic")
          ? "image/jpeg"
          : "application/pdf"),
      fileUrl:
        selectedFileUrl ||
        "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80",
      uploadedAt: getUploadDate(),
      uploader: "Admin Officer",
    };

    addDocument(newDoc);
    setIsUploadModalOpen(false);
    setUploadTitle("");
    setSelectedFileName("");
    setSelectedFileUrl("");
    setNotificationMsg("Document uploaded and attached to customer profile successfully!");
    setTimeout(() => setNotificationMsg(""), 3500);
  };

  const handleDownload = (doc: CustomerDocument) => {
    const link = document.createElement("a");
    link.href = doc.fileUrl;
    link.download = doc.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="mx-auto workspace-page">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-red-600 uppercase tracking-wider">
            CUSTOMER PROFILE
          </p>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mt-1">
            {customer.fullName || customer.name}
          </h1>
          <p className="text-xs text-slate-500">
            Customer ID: <span className="font-mono font-semibold text-slate-700">{customer.id}</span> · Registered on {customer.registeredAt || "2026-09-18"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/customers"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-xs transition"
          >
            <ArrowLeft size={14} /> Back
          </Link>
          <Link
            href={`/customers/${customer.id}/edit`}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-xs transition"
          >
            <Edit size={14} /> Edit Profile
          </Link>
          <Link
            href={`/repayments`}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-semibold text-white shadow-xs transition"
          >
            <Receipt size={14} /> Record Repayment
          </Link>
          <Link
            href={`/loans/new?customerId=${customer.id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-xs font-bold text-white shadow-md transition"
          >
            <Plus size={14} /> New Loan
          </Link>
        </div>
      </div>

      {notificationMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-emerald-800 text-xs font-semibold animate-fade-in shadow-xs" role="status">
          <CheckCircle size={18} className="text-emerald-600 shrink-0" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Profile Overview Card (Photograph, Status, ID, Quick Info) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex flex-wrap items-center gap-5">
          <div className="relative shrink-0">
            <img
              src={
                customer.photoUrl ||
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80"
              }
              alt={customer.name}
              className="w-20 h-20 rounded-2xl object-cover border-2 border-red-500 shadow-md bg-slate-100"
            />
            <span
              className={`absolute -bottom-1.5 -right-1.5 px-2 py-0.5 rounded-full text-xs font-semibold uppercase shadow-xs ${
                customer.status.toLowerCase() === "active"
                  ? "bg-emerald-500 text-white"
                  : customer.status.toLowerCase() === "suspended"
                  ? "bg-red-500 text-white"
                  : "bg-slate-500 text-white"
              }`}
            >
              {customer.status}
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-semibold text-slate-900">{customer.name}</h2>
              <span className="font-mono text-xs font-semibold px-2.5 py-0.5 bg-slate-100 rounded-md text-slate-600">
                {customer.id}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                {customer.occupation || "Employed"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-4">
              <span>
                NIC: <strong className="font-mono text-slate-800">{customer.nic}</strong>
              </span>
              <span>
                Phone: <strong className="text-slate-800">{customer.phone}</strong>
              </span>
              {customer.address && <span>Address: <strong className="text-slate-800">{customer.address}</strong></span>}
            </p>
          </div>
        </div>

        {/* Aggregate Customer Stats */}
        <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 w-full md:w-auto justify-between md:justify-start">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Borrowed
            </p>
            <p className="text-lg font-semibold text-slate-900 mt-0.5">
              {MONEY(totalBorrowed)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Active Loans
            </p>
            <p className="text-lg font-semibold text-red-600 mt-0.5">
              {customerLoans.filter((l) => l.status === "Active").length} Loans
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Verified Docs
            </p>
            <p className="text-lg font-semibold text-blue-600 mt-0.5">
              {customerDocs.length} Files
            </p>
          </div>
        </div>
      </div>

      {/* OUTSTANDING BALANCE & SETTLEMENT PROGRESS BANNER */}
      <div className="bg-gradient-to-r from-black via-[#2a040b] to-[#4a0512] border border-red-950 p-6 rounded-2xl text-white shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-rose-400 uppercase tracking-wider">
              CURRENT OUTSTANDING LOAN BALANCE & SETTLEMENT
            </p>
            <h3 className="text-2xl font-semibold font-mono text-white mt-1">
              {MONEY(currentOutstandingBalance)}
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Cumulative balance due across all active and prior loan contracts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
            <div className="bg-white/10 px-4 py-2.5 rounded-xl border border-white/10">
              <span className="text-xs uppercase font-semibold text-slate-400 block">
                Total Repayable
              </span>
              <span className="text-sm font-semibold text-white">{MONEY(totalRepayable)}</span>
            </div>
            <div className="bg-emerald-500/20 px-4 py-2.5 rounded-xl border border-emerald-500/30">
              <span className="text-xs uppercase font-semibold text-emerald-400 block">
                Total Paid So Far
              </span>
              <span className="text-sm font-semibold text-emerald-300">{MONEY(totalPaid)}</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5 pt-2 border-t border-slate-700/80">
          <div className="flex justify-between text-xs text-slate-300 font-medium">
            <span>Repayment Progress</span>
            <span className="font-bold text-white">{paymentCompletionRate}% Settled</span>
          </div>
          <div className="w-full h-2.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${paymentCompletionRate}%` }}
            />
          </div>
        </div>

        {/* Prior Repayment History Notes if available */}
        {customer.priorRepaymentHistory && (
          <div className="pt-2 text-xs text-slate-300 flex items-center gap-2">
            <History size={14} className="text-rose-400 shrink-0" />
            <span>
              <strong>Prior Credit History:</strong> {customer.priorRepaymentHistory}
            </span>
          </div>
        )}
      </div>

      {/* Main Grid: Left Profile Information, Right Guarantor & Loans */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Personal, Contact, Financial Details & Documents */}
        <div className="lg:col-span-2 space-y-6">
          {/* Identity & Residential Panel */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
              <User size={14} className="text-red-600" /> Personal & Residential Profile
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50/80 rounded-xl">
                <span className="text-slate-400 block font-medium">Full Legal Name</span>
                <span className="font-semibold text-slate-800 text-sm mt-0.5 block">
                  {customer.fullName || customer.name}
                </span>
              </div>

              <div className="p-3 bg-slate-50/80 rounded-xl">
                <span className="text-slate-400 block font-medium">NIC Number</span>
                <span className="font-mono font-semibold text-slate-800 text-sm mt-0.5 block">
                  {customer.nic}
                </span>
              </div>

              <div className="p-3 bg-slate-50/80 rounded-xl">
                <span className="text-slate-400 block font-medium">Date of Birth & Gender</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {customer.dob || "—"} · {customer.gender || "Not Specified"}
                </span>
              </div>

              <div className="p-3 bg-slate-50/80 rounded-xl">
                <span className="text-slate-400 block font-medium">Customer Status</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {customer.status}
                </span>
              </div>

              <div className="sm:col-span-2 p-3 bg-slate-50/80 rounded-xl">
                <span className="text-slate-400 block font-medium">Residential Address</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {customer.address}
                </span>
                
              </div>
            </div>
          </div>

          {/* Contact & Communication Profile */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
              <Phone size={14} className="text-red-600" /> Contact & Communication Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50/80 rounded-xl">
                <span className="text-slate-400 block font-medium">Primary Contact Number</span>
                <span className="font-semibold text-slate-800 text-sm mt-0.5 block">
                  {customer.phone}
                </span>
              </div>

              <div className="p-3 bg-slate-50/80 rounded-xl">
                <span className="text-slate-400 block font-medium">Alternative Contact Number</span>
                <span className="font-semibold text-slate-800 text-sm mt-0.5 block">
                  {customer.alternatePhone || "None recorded"}
                </span>
              </div>

              <div className="p-3 bg-slate-50/80 rounded-xl">
                <span className="text-slate-400 block font-medium">Email Address</span>
                <span className="font-semibold text-slate-800 text-sm mt-0.5 block">
                  {customer.email || "—"}
                </span>
              </div>

              <div className="p-3 bg-slate-50/80 rounded-xl">
                <span className="text-slate-400 block font-medium">Emergency Contact</span>
                <span className="font-semibold text-slate-800 text-sm mt-0.5 block">
                  {customer.emergencyContact || "—"}
                </span>
              </div>
            </div>
          </div>

          {/* UPLOADED IDENTITY DOCUMENTS */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-red-600" />
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Uploaded Identity Documents ({customerDocs.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                <Upload size={13} /> Upload Document
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {customerDocs.map((doc: CustomerDocument) => (
                <div
                  key={doc.id}
                  className="p-4 rounded-xl border border-slate-200 hover:border-red-300 transition bg-slate-50/50 flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                        <FileText size={20} />
                      </div>
                      <div>
                        <p className="font-semibold text-xs text-slate-900 leading-tight">
                          {doc.title}
                        </p>
                        <p className="text-xs text-slate-400 capitalize mt-0.5">
                          {doc.type.replace(/_/g, " ")} · {doc.fileSize}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200/60 pt-2">
                    <span className="text-xs text-slate-400">
                      Uploaded {doc.uploadedAt}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedDocForPreview(doc)}
                        className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-white rounded-lg transition"
                        title="Preview Document"
                       aria-label="Preview Document">
                        <Eye size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownload(doc)}
                        className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-white rounded-lg transition"
                        title="Download File"
                       aria-label="Download File">
                        <Download size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteDocument(doc.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition"
                        title="Delete File"
                       aria-label="Delete File">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {customerDocs.length === 0 && (
                <div className="sm:col-span-2 p-4 sm:p-6 lg:p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center text-slate-400 text-xs space-y-2">
                  <FileText size={32} className="mx-auto text-slate-300" />
                  <p className="font-semibold text-slate-600">No documents uploaded yet</p>
                  <p>Upload NIC copy, photograph, or proof of income for verification.</p>
                </div>
              )}
            </div>
          </div>

          {/* PREVIOUS REPAYMENT HISTORY LEDGER */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <History size={16} className="text-emerald-600" />
                <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Previous Repayment History ({customerPayments.length} Collections)
                </h3>
              </div>
              <Link
                href="/repayments"
                className="text-xs font-bold text-red-600 hover:text-red-500 inline-flex items-center gap-1"
              >
                Go to Terminal <ArrowUpRight size={13} />
              </Link>
            </div>

            <div className="overflow-x-auto table-scroll" tabIndex={0} role="region" aria-label="Scrollable records table">
              <table className="w-full text-left text-xs lms-table">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-xs">
                  <tr>
                    <th className="py-2.5 px-4" scope="col">Date</th>
                    <th className="py-2.5 px-4" scope="col">Receipt No</th>
                    <th className="py-2.5 px-4" scope="col">Loan ID</th>
                    <th className="py-2.5 px-4" scope="col">Classification</th>
                    <th className="py-2.5 px-4" scope="col">Amount Paid</th>
                    <th className="py-2.5 px-4" scope="col">Method / Notes</th>
                    <th className="py-2.5 px-4 text-right" scope="col">Official Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {customerPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-4 font-mono font-medium text-slate-600">
                        {payment.date}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-red-600">
                        {payment.receiptNo || payment.id}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-700">
                        {payment.loanId}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            payment.type === "Capital"
                              ? "bg-red-100 text-red-700"
                              : payment.type === "Interest"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {payment.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono font-semibold text-slate-900">
                        {MONEY(payment.amount)}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">
                        <span>{payment.method || "Cash"}</span>
                        {payment.notes && (
                          <span className="block text-xs text-slate-400 truncate max-w-xs">
                            {payment.notes}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedReceiptPayment(payment)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-xs"
                          title="View & Print Official Receipt"
                        >
                          <Receipt size={13} className="text-white shrink-0" />
                          <span className="text-white font-bold">Receipt</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {customerPayments.length === 0 && (
                <div className="p-4 sm:p-6 lg:p-8 text-center text-slate-400 text-xs">
                  <Receipt size={28} className="mx-auto text-slate-300 mb-1" />
                  <p className="font-semibold text-slate-600">No repayment history recorded</p>
                  <p>Payments collected through the repayments module will appear here.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Guarantor Details & Existing Loans */}
        <div className="space-y-6">
          {/* Guarantor Details Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
              <ShieldCheck size={14} className="text-red-600" /> Guarantor Information
            </h3>

            {customer.guarantorName || customer.guarantor ? (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-xs">Guarantor Full Name</span>
                  <span className="font-semibold text-slate-800 text-sm">
                    {customer.guarantorName || customer.guarantor}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Guarantor NIC</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {customer.guarantorNic || "Verification on file"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Contact Phone</span>
                  <span className="font-semibold text-slate-800">
                    {customer.guarantorPhone || "Same as primary"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Relationship</span>
                  <span className="font-semibold text-slate-800">
                    {customer.guarantorRelationship || "Relative / Colleague"}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                No guarantor assigned to this borrower record.
              </p>
            )}
          </div>

          {/* Emergency Contact */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-3 text-xs">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">
              Emergency Contact
            </h3>
            <p className="font-semibold text-slate-800">
              {customer.emergencyContact || "No emergency contact specified."}
            </p>
          </div>

          {/* EXISTING LOANS & OUTSTANDING BALANCES LIST */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Existing Loans
              </h3>
              <span className="text-xs font-bold text-red-600">
                {customerLoans.length} Loans
              </span>
            </div>

            <div className="space-y-3">
              {customerLoans.map((loan) => {
                const loanPaid = customerPayments
                  .filter((p) => p.loanId === loan.id)
                  .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                const loanBalanceDue = Math.max(0, (loan.totalRepayment || 0) - loanPaid);

                return (
                  <Link
                    key={loan.id}
                    href={`/loans/${loan.id}`}
                    className="p-3.5 bg-slate-50 hover:bg-red-50/80 border border-slate-200/80 rounded-xl block transition space-y-2"
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-mono font-semibold text-slate-800">
                        {loan.loanNo || loan.id}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          loan.status.toLowerCase() === "active"
                            ? "bg-emerald-100 text-emerald-700"
                            : loan.status.toLowerCase() === "completed"
                            ? "bg-red-100 text-red-700"
                            : loan.status.toLowerCase() === "overdue"
                            ? "bg-red-100 text-red-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {loan.status}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs text-slate-600">
                      <span>Principal: <strong>{MONEY(loan.principal || loan.amount || 0)}</strong></span>
                      <span>Installment: <strong>{MONEY(loan.installment || 0)}</strong></span>
                    </div>

                    <div className="pt-1.5 border-t border-slate-200/60 flex justify-between items-center text-xs">
                      <span className="text-xs text-slate-400">Balance Due:</span>
                      <span className="font-mono font-semibold text-red-600">
                        {MONEY(loanBalanceDue)}
                      </span>
                    </div>
                  </Link>
                );
              })}

              {customerLoans.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">
                  No active or past loans linked to this borrower.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* DOCUMENT PREVIEW MODAL */}
      {selectedDocForPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 lms-overlay">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-sm space-y-4 animate-in fade-in zoom-in-95 duration-150 lms-dialog">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">{selectedDocForPreview.title}</h3>
                <p className="text-xs text-slate-400">
                  {selectedDocForPreview.fileName} · {selectedDocForPreview.fileSize}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDocForPreview(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
               aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <div className="bg-slate-950 rounded-2xl p-4 flex items-center justify-center min-h-[320px] max-h-[500px] overflow-hidden">
              {selectedDocForPreview.fileType.includes("image") ? (
                <img
                  src={selectedDocForPreview.fileUrl}
                  alt={selectedDocForPreview.title}
                  className="max-h-[460px] object-contain rounded-lg"
                />
              ) : (
                <div className="text-center text-slate-400 space-y-3 p-8">
                  <FileText size={48} className="mx-auto text-rose-400" />
                  <p className="text-sm font-semibold text-slate-200">
                    PDF Document: {selectedDocForPreview.fileName}
                  </p>
                  <p className="text-xs text-slate-400">
                    Document securely archived with cryptographic signature verification.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleDownload(selectedDocForPreview)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition"
                  >
                    <Download size={14} /> Download Document
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleDownload(selectedDocForPreview)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                <Download size={14} /> Download File
              </button>
              <button
                type="button"
                onClick={() => setSelectedDocForPreview(null)}
                className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-500 transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD DOCUMENT MODAL */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 lms-overlay">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-sm space-y-4 animate-in fade-in zoom-in-95 duration-150 lms-dialog">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Upload Identity Document</h3>
                <p className="text-xs text-slate-400">Attach NIC, passport, or financial verification proof.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
               aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700" htmlFor="ui-field-1">Document Title</label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold"
                  required
                 id="ui-field-1"/>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700" htmlFor="ui-field-2">Document Type</label>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value as CustomerDocument["type"])}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold bg-white"
                >
                  <option value="other">Other Supporting Document</option>
                  <option value="utility_bill">Proof of Billing / Utility Bill</option>
                  <option value="salary_slip">Salary Slip / Income Record</option>
                  <option value="agreement">Loan Agreement / Contract</option>
                  <option value="photo">Customer Photograph</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Select File</label>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-red-500 rounded-2xl p-6 cursor-pointer bg-slate-50/50 hover:bg-red-50/30 transition text-center">
                  <Upload size={24} className="text-slate-400 mb-2" />
                  <span className="text-xs font-semibold text-slate-700">
                    {selectedFileName || "Click to browse JPG, PNG or PDF"}
                  </span>
                  <span className="text-xs text-slate-400 mt-1">
                    Max size 15MB · High resolution recommended
                  </span>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-xl transition shadow-xs"
                >
                  Save & Attach
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Receipt Modal */}
      {selectedReceiptPayment && (
        <ReceiptModal
          payment={selectedReceiptPayment}
          onClose={() => setSelectedReceiptPayment(null)}
          customer={customer}
        />
      )}
    </div>
  );
}

export default function CustomerProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto text-xs text-slate-400 workspace-page">
          Loading customer profile...
        </div>
      }
    >
      <CustomerDetailsContent />
    </Suspense>
  );
}