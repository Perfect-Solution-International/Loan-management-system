/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  CreditCard,
  Building,
  Upload,
  CheckCircle2,
  Copy,
  Check,
  Lock,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  X,
  Printer,
  Clock,
  Sparkles,
  Smartphone,
  FileText,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Shield,
  HelpCircle,
  Info,
} from "lucide-react";
import { useData } from "@/providers/data-provider";
import { MONEY } from "@/constants";
import { BrandLogo } from "@/components/brand-logo";
import type { Customer, Loan, Payment, OnlinePayment } from "@/types";

interface CustomerPaymentGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  loans: Loan[];
  initialLoanId?: string;
  todayDate?: string;
  onPaymentSuccess?: (receiptNo?: string, slipId?: string) => void;
}

type PaymentMethodType = "BANK_SLIP" | "CARD";

export function CustomerPaymentGatewayModal({
  isOpen,
  onClose,
  customer,
  loans,
  initialLoanId,
  todayDate,
  onPaymentSuccess,
}: CustomerPaymentGatewayModalProps) {
  const { addOnlinePayment, addPayment, getNextReceiptNo, repayments } = useData();
  const effectiveTodayDate = todayDate || new Date().toISOString().slice(0, 10);

  // Active Loan selection
  const [selectedLoanId, setSelectedLoanId] = useState<string>(() => {
    if (initialLoanId && loans.some((l) => l.id === initialLoanId)) {
      return initialLoanId;
    }
    return loans[0]?.id || "";
  });

  const selectedLoan = useMemo(() => {
    return loans.find((l) => l.id === selectedLoanId) || loans[0] || null;
  }, [loans, selectedLoanId]);

  // Selected Loan financial stats
  const loanFinancials = useMemo(() => {
    if (!selectedLoan) {
      return { totalPayable: 0, totalPaid: 0, outstanding: 0, nextInstallment: 0 };
    }
    const principal = selectedLoan.principal || selectedLoan.amount || 0;
    const interest = selectedLoan.interest || (selectedLoan.totalRepayment ? selectedLoan.totalRepayment - principal : 0);
    const totalPayable = selectedLoan.totalRepayment || (principal + interest);

    const loanPayments = repayments.filter(
      (p) => p.loanId === selectedLoan.id || (p.customerId === customer.id && !p.loanId)
    );
    const totalPaid = loanPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const outstanding = Math.max(0, totalPayable - totalPaid);
    const nextInstallment =
      selectedLoan.installment ||
      (totalPayable > 0 ? Math.ceil(totalPayable / (selectedLoan.duration || 1)) : 0);

    return { totalPayable, totalPaid, outstanding, nextInstallment };
  }, [selectedLoan, repayments, customer.id]);

  // Payment amount & quick selection
  const [payAmount, setPayAmount] = useState<string>(() => {
    return loanFinancials.nextInstallment ? String(loanFinancials.nextInstallment) : "5000";
  });

  // Selected Payment Method
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("BANK_SLIP");

  // Bank Slip Upload Fields
  const [slipBank, setSlipBank] = useState("Commercial Bank of Ceylon");
  const [slipRef, setSlipRef] = useState("");
  const [slipDate, setSlipDate] = useState(() => effectiveTodayDate);
  const [slipNotes, setSlipNotes] = useState("");

  useEffect(() => {
    setSlipDate(effectiveTodayDate);
  }, [effectiveTodayDate]);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setErrorMessage("");
      if (initialLoanId && loans.some((l) => l.id === initialLoanId)) {
        setSelectedLoanId(initialLoanId);
        const match = loans.find((l) => l.id === initialLoanId);
        if (match?.installment) {
          setPayAmount(String(match.installment));
        }
      }
    }
  }, [isOpen, initialLoanId, loans]);

  useEffect(() => {
    if (selectedLoan?.installment) {
      setPayAmount(String(selectedLoan.installment));
    } else if (loanFinancials.nextInstallment > 0) {
      setPayAmount(String(loanFinancials.nextInstallment));
    }
  }, [selectedLoanId]);
  const [slipImageBase64, setSlipImageBase64] = useState("");
  const [slipFileName, setSlipFileName] = useState("");

  // Card Payment Fields
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState(customer.fullName || customer.name || "");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [isProcessingCard, setIsProcessingCard] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState("123456");

  // Status & Feedback
  const [errorMessage, setErrorMessage] = useState("");

  // Step Navigation: 1 = Amount, 2 = Channel, 3 = Payment Details
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setErrorMessage("");
    }
  }, [isOpen]);

  // Success Confirmation State
  const [completedTransaction, setCompletedTransaction] = useState<{
    method: PaymentMethodType;
    amount: number;
    receiptNo?: string;
    slipId?: string;
    refNumber?: string;
    authCode?: string;
  } | null>(null);

  const SRI_LANKAN_BANKS = [
    "Commercial Bank of Ceylon",
    "Bank of Ceylon (BOC)",
    "People's Bank",
    "Sampath Bank",
    "Hatton National Bank (HNB)",
    "Nations Trust Bank (NTB)",
    "Seylan Bank",
    "DFCC Bank",
    "National Savings Bank (NSB)",
    "Pan Asia Bank",
    "Union Bank",
    "Other / Digital Transfer",
  ];

  // Helper: Format Card Number (XXXX XXXX XXXX XXXX)
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
    const formatted = raw.replace(/(\d{4})/g, "$1 ").trim();
    setCardNumber(formatted);
  };

  // Helper: Format Expiry Date (MM/YY)
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (raw.length >= 2) {
      raw = raw.slice(0, 2) + "/" + raw.slice(2);
    }
    setCardExpiry(raw);
  };

  // Helper: Detect Card Brand
  const cardBrand = useMemo(() => {
    const clean = cardNumber.replace(/\s/g, "");
    if (clean.startsWith("4")) return "VISA";
    if (/^5[1-5]/.test(clean) || /^2[2-7]/.test(clean)) return "MASTERCARD";
    if (/^3[47]/.test(clean)) return "AMEX";
    return "CARD";
  }, [cardNumber]);

  // Handle Slip Image File selection (with automatic client-side canvas compression)
  const handleSlipFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      setErrorMessage("Please select a valid image file (PNG, JPG, WEBP) or PDF.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("File exceeds 10MB limit. Please upload a smaller file.");
      return;
    }

    setSlipFileName(file.name);
    setErrorMessage("");

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (!result) return;

      if (file.type.startsWith("image/")) {
        // Automatically resize and compress image to fit within localStorage safely (< 150KB)
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const maxDim = 1200;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL("image/jpeg", 0.85);
            setSlipImageBase64(compressed);
          } else {
            setSlipImageBase64(result);
          }
        };
        img.onerror = () => {
          setSlipImageBase64(result);
        };
        img.src = result;
      } else {
        setSlipImageBase64(result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Validate amount
  const validateAmount = (): number | null => {
    const num = Number(payAmount);
    if (!num || isNaN(num) || num <= 0) {
      setErrorMessage("Please enter a valid payment amount greater than LKR 0.");
      return null;
    }
    return num;
  };

  // Step wizard navigation handlers
  const handleProceedToStep2 = () => {
    setErrorMessage("");
    const validAmt = validateAmount();
    if (!validAmt) return;
    setCurrentStep(2);
  };

  const handleProceedToStep3 = () => {
    setErrorMessage("");
    setCurrentStep(3);
  };

  // Handle Bank Slip / LankaQR Submission
  const handleSubmitBankSlip = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const validAmt = validateAmount();
    if (!validAmt) return;

    if (!selectedLoan) {
      setErrorMessage("Please select a valid loan facility.");
      return;
    }

    if (!slipImageBase64) { setErrorMessage("Please upload your bank payment slip."); return; }

    // Default SVG slip preview if user didn't upload custom file
    const effectiveBank = slipBank || "Bank Transfer";
    const effectiveDate = slipDate || new Date().toISOString().split("T")[0];
    const effectiveRef = slipRef.trim().toUpperCase() || `DEP-${Date.now().toString().slice(-6)}`;

    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="380" viewBox="0 0 600 380">
      <rect width="100%" height="100%" fill="#f8fafc" rx="16" stroke="#cbd5e1" stroke-width="2"/>
      <rect x="20" y="20" width="560" height="340" rx="12" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5"/>
      <rect x="20" y="20" width="560" height="60" rx="12" fill="#0f172a"/>
      <text x="44" y="56" font-family="sans-serif" font-size="16" font-weight="bold" fill="#ffffff">OFFICIAL BANK TRANSFER SLIP</text>
      <text x="560" y="56" font-family="sans-serif" font-size="11" fill="#94a3b8" text-anchor="end">ELECTRONIC RECORD</text>
      <text x="44" y="115" font-family="sans-serif" font-size="11" font-weight="bold" fill="#64748b">BANK NAME</text>
      <text x="44" y="138" font-family="sans-serif" font-size="15" font-weight="bold" fill="#0f172a">${effectiveBank}</text>
      <text x="320" y="115" font-family="sans-serif" font-size="11" font-weight="bold" fill="#64748b">REFERENCE NUMBER</text>
      <text x="320" y="138" font-family="monospace" font-size="15" font-weight="bold" fill="#dc2626">${effectiveRef}</text>
      <text x="44" y="180" font-family="sans-serif" font-size="11" font-weight="bold" fill="#64748b">BORROWER</text>
      <text x="44" y="200" font-family="sans-serif" font-size="13" font-weight="bold" fill="#1e293b">${customer.fullName || customer.name || "Customer"}</text>
      <text x="320" y="180" font-family="sans-serif" font-size="11" font-weight="bold" fill="#64748b">LOAN FACILITY</text>
      <text x="320" y="200" font-family="monospace" font-size="13" font-weight="bold" fill="#1e293b">${selectedLoan.loanNo || selectedLoan.id}</text>
      <text x="44" y="240" font-family="sans-serif" font-size="11" font-weight="bold" fill="#64748b">TRANSFER DATE</text>
      <text x="44" y="260" font-family="monospace" font-size="13" font-weight="bold" fill="#1e293b">${effectiveDate}</text>
      <line x1="44" y1="280" x2="560" y2="280" stroke="#e2e8f0" stroke-dasharray="4"/>
      <text x="44" y="315" font-family="sans-serif" font-size="12" font-weight="bold" fill="#64748b">AMOUNT DEPOSITED</text>
      <text x="44" y="345" font-family="monospace" font-size="26" font-weight="bold" fill="#16a34a">LKR ${validAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</text>
      <rect x="380" y="295" width="180" height="50" rx="8" fill="#f0fdf4" stroke="#86efac" stroke-width="1"/>
      <text x="470" y="325" font-family="sans-serif" font-size="11" font-weight="bold" fill="#166534" text-anchor="middle">ELECTRONIC DEPOSIT</text>
    </svg>`;
    const fallbackSlipSvg = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgContent);

    const slipId = `SLIP-${Date.now().toString().slice(-6)}`;

    // Bank transfer slips are submitted for administrative review & approval.
    // Official receipt and loan credit will occur only once verified and approved by admin.
    const newOnlinePayment: OnlinePayment = {
      id: slipId,
      loanId: selectedLoan.id,
      loanNo: selectedLoan.loanNo || selectedLoan.id,
      customerId: customer.id,
      customerName: customer.fullName || customer.name || "Customer",
      customerNic: customer.nic,
      customerPhone: customer.phone,
      amount: validAmt,
      paymentDate: effectiveDate,
      submittedAt: new Date().toISOString(),
      bankName: effectiveBank,
      referenceNumber: effectiveRef,
      slipUrl: slipImageBase64 || fallbackSlipSvg,
      slipFileName: slipFileName || "bank_deposit_slip.jpg",
      status: "PENDING",
      notes: slipNotes.trim() || undefined,
      paymentMethod: "BANK_SLIP",
    };

    if (!(await addOnlinePayment(newOnlinePayment))) return;

    setCompletedTransaction({
      method: "BANK_SLIP",
      amount: validAmt,
      slipId,
      refNumber: newOnlinePayment.referenceNumber,
    });

    if (onPaymentSuccess) {
      onPaymentSuccess(undefined, slipId);
    }
  };

  const handleInitiateCardPayment = (e: React.FormEvent) => {
    e.preventDefault(); setErrorMessage("Card payments are not configured. Please submit a bank transfer slip for review.");
  };
  const handleConfirmOtpPayment = () => {
    setShowOtpModal(false); setErrorMessage("Card payments are not configured. No payment has been recorded.");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto lms-overlay">
      <div className="bg-white rounded-3xl border border-slate-200/90 max-w-2xl w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-auto overflow-hidden flex flex-col lms-dialog">
        {/* ── Modal Header: Fintech Branding & Security Badge ──────────────── */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center text-white shadow-md shadow-red-900/40">
              <Lock size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold tracking-tight text-white leading-tight">
                  PSI One Payment Portal
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  <ShieldCheck size={11} /> Online payment
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Submit a repayment and track its status
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer" aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── STEP 4: Success View (Shown upon transaction completion) ──────── */}
        {completedTransaction ? (
          <div className="p-6 sm:p-8 space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 size={36} className="animate-bounce" />
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                {completedTransaction.method === "CARD"
                  ? "Instant Card Payment Approved"
                  : "Deposit Slip Submitted Successfully"}
              </span>
              <h3 className="text-2xl font-semibold text-slate-900 font-mono">
                {MONEY(completedTransaction.amount)}
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                {completedTransaction.method === "CARD"
                  ? `Your payment has been credited to loan facility #${selectedLoan?.loanNo || selectedLoan?.id} instantly. Your official settlement receipt has been generated.`
                  : `Your deposit slip (ID: ${completedTransaction.slipId}) is under review by our finance operations desk. The loan balance will update upon admin sign-off.`}
              </p>
            </div>

            {/* Transaction metadata box */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 max-w-md mx-auto text-xs space-y-2 text-left">
              <div className="flex justify-between">
                <span className="text-slate-500">Borrower:</span>
                <span className="font-bold text-slate-900">{customer.fullName || customer.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Loan Facility:</span>
                <span className="font-mono font-bold text-red-600">{selectedLoan?.loanNo || selectedLoan?.id}</span>
              </div>
              {completedTransaction.receiptNo && (
                <div className="flex justify-between border-t border-slate-200/80 pt-1.5">
                  <span className="text-slate-500 font-bold">Official Receipt No:</span>
                  <span className="font-mono font-semibold text-emerald-600 text-sm">
                    {completedTransaction.receiptNo}
                  </span>
                </div>
              )}
              {completedTransaction.refNumber && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Transaction Ref:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {completedTransaction.refNumber}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Processed At:</span>
                <span className="text-slate-800">{new Date().toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCompletedTransaction(null);
                  onClose();
                }}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* ── Main Gateway Form (Steps 1, 2, 3) ───────────────────────────── */
          <div className="p-4 sm:p-6 space-y-5 overflow-y-auto max-h-[calc(88vh-80px)]">
            {/* Error Notification */}
            {errorMessage && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-2.5 rounded-2xl text-xs flex items-center justify-between gap-2 animate-in fade-in" role="alert">
                <div className="flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0 text-rose-500" />
                  <span className="font-medium">{errorMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorMessage("")}
                  className="text-rose-500 hover:text-rose-700 p-0.5 cursor-pointer" aria-label="Close"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* ═══ Step Wizard Progress Indicator ═══════════════════════════ */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
              <div className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition ${
                    currentStep === 1
                      ? "bg-red-600 text-white shadow-xs shadow-red-500/30"
                      : currentStep > 1
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {currentStep > 1 ? <Check size={13} /> : "1"}
                </div>
                <span
                  className={`text-xs font-bold transition ${
                    currentStep === 1
                      ? "text-slate-900"
                      : currentStep > 1
                      ? "text-emerald-700 font-semibold"
                      : "text-slate-400"
                  }`}
                >
                  Amount
                </span>
              </div>

              <div
                className={`h-0.5 flex-1 mx-3 rounded-full transition ${
                  currentStep > 1 ? "bg-emerald-500" : "bg-slate-200"
                }`}
              />

              <div className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition ${
                    currentStep === 2
                      ? "bg-red-600 text-white shadow-xs shadow-red-500/30"
                      : currentStep > 2
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {currentStep > 2 ? <Check size={13} /> : "2"}
                </div>
                <span
                  className={`text-xs font-bold transition ${
                    currentStep === 2
                      ? "text-slate-900"
                      : currentStep > 2
                      ? "text-emerald-700 font-semibold"
                      : "text-slate-400"
                  }`}
                >
                  Method
                </span>
              </div>

              <div
                className={`h-0.5 flex-1 mx-3 rounded-full transition ${
                  currentStep > 2 ? "bg-emerald-500" : "bg-slate-200"
                }`}
              />

              <div className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition ${
                    currentStep === 3
                      ? "bg-red-600 text-white shadow-xs shadow-red-500/30"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  3
                </div>
                <span
                  className={`text-xs font-bold transition ${
                    currentStep === 3 ? "text-slate-900" : "text-slate-400"
                  }`}
                >
                  Pay
                </span>
              </div>
            </div>

            {/* ═══ STEP 1: Facility Selection & Amount ════════════════════════ */}
            {currentStep === 1 && (
              <div className="space-y-5 animate-in fade-in-50 duration-200">
                <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 pb-3">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Target Loan Facility
                      </span>
                      {loans.length > 1 ? (
                        <select
                          value={selectedLoanId}
                          onChange={(e) => {
                            setSelectedLoanId(e.target.value);
                            const match = loans.find((l) => l.id === e.target.value);
                            if (match?.installment) {
                              setPayAmount(String(match.installment));
                            }
                          }}
                          className="mt-0.5 text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                        >
                          {loans.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.loanNo || l.id} · Disbursed: {MONEY(l.principal || l.amount || 0)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <h3 className="text-sm font-semibold text-slate-900 font-mono">
                          {selectedLoan?.loanNo || selectedLoan?.id || "N/A"}
                        </h3>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono">
                      <div className="text-right">
                        <span className="text-[11px] text-slate-500 font-bold uppercase block">
                          Outstanding
                        </span>
                        <span className="text-sm font-semibold text-slate-900">
                          {MONEY(loanFinancials.outstanding)}
                        </span>
                      </div>
                      <div className="text-right border-l border-slate-200 pl-3">
                        <span className="text-[11px] text-amber-600 font-bold uppercase block">
                          Installment
                        </span>
                        <span className="text-sm font-semibold text-amber-700">
                          {MONEY(loanFinancials.nextInstallment)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Amount Quick-Select Pills */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 flex justify-between">
                      <span>Enter Amount to Pay (LKR)</span>
                      <span className="text-slate-400 font-normal">
                        Remaining after pay:{" "}
                        <b>
                          {MONEY(
                            Math.max(0, loanFinancials.outstanding - (Number(payAmount) || 0))
                          )}
                        </b>
                      </span>
                    </label>

                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">
                        LKR
                      </span>
                      <input
                        type="number"
                        min="100"
                        step="any"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        placeholder="e.g. 5000"
                        className="w-full h-11 pl-12 pr-4 bg-white border border-slate-300 rounded-xl text-base font-mono font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition"
                      />
                    </div>

                    {/* Quick Presets - 1 Installment only */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {loanFinancials.nextInstallment > 0 && (
                        <button
                          type="button"
                          onClick={() => setPayAmount(String(loanFinancials.nextInstallment))}
                          className="text-[11px] font-bold px-3 py-1.5 rounded-lg border transition cursor-pointer bg-red-600 text-white border-red-600 shadow-2xs"
                        >
                          1 Installment ({MONEY(loanFinancials.nextInstallment)})
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Step 1 Action Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleProceedToStep2}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-xs shadow-red-600/20 flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Next</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            )}

            {/* ═══ STEP 2: Choose Payment Method ══════════════════════════════ */}
            {currentStep === 2 && (
              <div className="space-y-5 animate-in fade-in-50 duration-200">
                {/* Summary Strip */}
                <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Target Facility &amp; Amount
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 text-xs">
                        {selectedLoan?.loanNo || selectedLoan?.id}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="font-mono font-semibold text-red-600 text-sm">
                        LKR {Number(payAmount || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
                  >
                    Edit Amount
                  </button>
                </div>

                {/* Payment Channels Grid */}
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                    Choose Payment Channel
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Method 1: Bank Transfer */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("BANK_SLIP")}
                      className={`p-4 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between h-24 ${
                        paymentMethod === "BANK_SLIP"
                          ? "border-red-600 bg-red-50/50 shadow-sm ring-2 ring-red-500/20"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-8 h-8 rounded-xl bg-red-100/70 text-red-600 flex items-center justify-center">
                          <Upload size={16} />
                        </div>
                        {paymentMethod === "BANK_SLIP" && (
                          <CheckCircle2 size={16} className="text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-900 leading-tight">Bank Transfer</p>
                        <p className="text-[11px] text-slate-500 font-medium">Direct Transfer / Slip Proof</p>
                      </div>
                    </button>

                    {/* Method 2: Credit / Debit Card */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("CARD")}
                      className={`p-4 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between h-24 ${
                        paymentMethod === "CARD"
                          ? "border-red-600 bg-red-50/50 shadow-sm ring-2 ring-red-500/20"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-8 h-8 rounded-xl bg-red-100/70 text-red-600 flex items-center justify-center">
                          <CreditCard size={16} />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                            Instant
                          </span>
                          {paymentMethod === "CARD" && (
                            <CheckCircle2 size={16} className="text-red-600" />
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-900 leading-tight">Card Payment</p>
                        <p className="text-[11px] text-slate-500 font-medium">Visa / Mastercard 3D Secure</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Step 2 Action Buttons */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft size={13} />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleProceedToStep3}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-xs shadow-red-600/20 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Next</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            )}

            {/* ═══ STEP 3: Complete Payment (Bank Slip / Card) ═════════════════ */}
            {currentStep === 3 && (
              <div className="space-y-4 animate-in fade-in-50 duration-200">
                {/* Channel & Facility Summary */}
                <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-medium">Paying:</span>
                    <span className="font-mono font-semibold text-slate-900">
                      LKR {Number(payAmount || 0).toLocaleString()}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="font-medium text-slate-600">
                      {paymentMethod === "BANK_SLIP" ? "Bank Transfer" : "Card Payment"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="text-[11px] font-bold text-red-600 hover:underline cursor-pointer"
                  >
                    Change Method
                  </button>
                </div>

                {/* ── 3A: Bank Slip Upload Form (Bank Accounts section completely removed) ── */}
                {paymentMethod === "BANK_SLIP" && (
                  <form onSubmit={handleSubmitBankSlip} className="space-y-4">
                    <div className="space-y-3">
                      <span className="text-[11px] font-bold text-slate-700 block">
                        Upload proof of payment &amp; deposit slip
                      </span>

                      {/* Drag & Drop File Zone */}
                      <div className="border-2 border-dashed border-slate-300 hover:border-red-400 rounded-2xl p-4 bg-slate-50/60 hover:bg-slate-50 transition text-center relative">
                        <input
                          type="file"
                          id="slip-upload-file"
                          accept="image/*"
                          onChange={handleSlipFileSelect}
                          className="hidden"
                        />

                        {slipImageBase64 ? (
                          <div className="space-y-2">
                            <img
                              src={slipImageBase64}
                              alt="Slip Preview"
                              className="max-h-40 mx-auto rounded-xl border border-slate-200 shadow-xs object-contain"
                            />
                            <div className="flex items-center justify-center gap-3">
                              <label
                                htmlFor="slip-upload-file"
                                className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
                              >
                                Change Slip Image
                              </label>
                              <span className="text-slate-300">·</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setSlipImageBase64("");
                                  setSlipFileName("");
                                }}
                                className="text-xs font-bold text-slate-500 hover:text-rose-600 cursor-pointer"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label
                            htmlFor="slip-upload-file"
                            className="cursor-pointer flex flex-col items-center justify-center gap-2 py-3"
                          >
                            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                              <Upload size={22} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800">
                                Click to upload deposit slip or bank transfer screenshot
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Supports PNG, JPG, JPEG up to 5MB
                              </p>
                            </div>
                          </label>
                        )}
                      </div>

                      {/* Note / Remarks Field Only */}
                      <div className="text-xs">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1" htmlFor="field-components-payment-CustomerPaymentGatewayModal-1">
                          Remarks / Note (Optional)
                        </label>
                        <input
                          type="text"
                          value={slipNotes}
                          onChange={(e) => setSlipNotes(e.target.value)}
                          placeholder="e.g. Paid via CDM at Maharagama"
                          className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" id="field-components-payment-CustomerPaymentGatewayModal-1"
                        />
                      </div>
                    </div>

                    {/* Navigation & Submit Action */}
                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <ArrowLeft size={13} />
                        <span>Back</span>
                      </button>
                      <button
                        type="submit"
                        className="px-8 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-xs shadow-red-600/20 flex items-center justify-center cursor-pointer"
                      >
                        <span>Submit</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* ── 3B: Credit / Debit Card Interactive Gateway ── */}
                {paymentMethod === "CARD" && (
                  <form onSubmit={handleInitiateCardPayment} className="space-y-4">
                    {/* Interactive Virtual Card Mockup */}
                    <div className="bg-gradient-to-tr from-slate-900 via-slate-800 to-red-950 text-white p-5 rounded-2xl shadow-xl relative overflow-hidden border border-slate-700/60 max-w-sm mx-auto">
                      <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-red-600/20 blur-xl pointer-events-none" />
                      <div className="absolute -left-8 -bottom-8 w-32 h-32 rounded-full bg-blue-600/20 blur-xl pointer-events-none" />

                      <div className="relative z-10 flex flex-col justify-between h-44">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono tracking-widest text-slate-400">
                            PSI ONE SECURE PAY
                          </span>
                          <span className="text-xs font-semibold italic tracking-wider text-white">
                            {cardBrand}
                          </span>
                        </div>

                        <div className="w-9 h-7 rounded-md bg-gradient-to-br from-amber-300 to-amber-500 border border-amber-200/50 shadow-inner my-auto flex items-center justify-center">
                          <div className="w-5 h-4 border border-amber-700/40 rounded-xs" />
                        </div>

                        <div className="space-y-2">
                          <p className="font-mono text-base sm:text-lg tracking-widest text-white font-bold drop-shadow-xs">
                            {cardNumber || "•••• •••• •••• ••••"}
                          </p>

                          <div className="flex items-center justify-between text-[11px] font-mono text-slate-300 uppercase">
                            <span className="truncate max-w-[170px]">
                              {cardHolder || "CARDHOLDER NAME"}
                            </span>
                            <span>{cardExpiry || "MM/YY"}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card input fields */}
                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1" htmlFor="field-components-payment-CustomerPaymentGatewayModal-2">
                          Cardholder Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                          placeholder="e.g. S A PERERA"
                          className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 uppercase" id="field-components-payment-CustomerPaymentGatewayModal-2"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Card Number <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            value={cardNumber}
                            onChange={handleCardNumberChange}
                            placeholder="4532 0000 0000 0000"
                            className="w-full h-9 pl-3 pr-10 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                          />
                          <CreditCard
                            size={16}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1" htmlFor="field-components-payment-CustomerPaymentGatewayModal-3">
                            Expiry Date <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={cardExpiry}
                            onChange={handleExpiryChange}
                            placeholder="MM/YY"
                            maxLength={5}
                            className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 text-center focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" id="field-components-payment-CustomerPaymentGatewayModal-3"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1" htmlFor="field-components-payment-CustomerPaymentGatewayModal-4">
                            CVV / CVC <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="password"
                            required
                            maxLength={4}
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ""))}
                            placeholder="•••"
                            className="w-full h-9 px-3 bg-white border border-slate-300 rounded-xl font-mono font-semibold text-slate-900 text-center focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" id="field-components-payment-CustomerPaymentGatewayModal-4"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Navigation & Pay CTA */}
                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <ArrowLeft size={13} />
                        <span>Back</span>
                      </button>
                      <button
                        type="submit"
                        disabled={isProcessingCard}
                        className="px-8 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-xs shadow-red-600/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                      >
                        {isProcessingCard ? (
                          <>
                            <RefreshCw size={13} className="animate-spin" />
                            <span>Processing...</span>
                          </>
                        ) : (
                          <span>Pay</span>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Footer Trust strip */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Shield size={12} className="text-emerald-600" />
                Loan repayment details
              </span>
              <span>PSI ONE Financial Services PLC</span>
            </div>
          </div>
        )}

        {/* ── Simulated 3D Secure / OTP Verification Modal ──────────────────── */}
        {showOtpModal && (
          <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 lms-overlay">
            <div className="bg-white rounded-3xl border border-slate-200 max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150 space-y-4 text-center">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Lock size={16} className="text-red-600" />
                  <span className="text-xs font-semibold tracking-tight text-slate-900">
                    3D Secure Authentication
                  </span>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                  {cardBrand}
                </span>
              </div>

              <div className="space-y-1">
                <Smartphone size={32} className="mx-auto text-slate-600 mb-1" />
                <h4 className="text-sm font-semibold text-slate-900">Enter One-Time Password</h4>
                <p className="text-xs text-slate-500">
                  A 6-digit OTP code has been sent to your registered mobile phone for security verification.
                </p>
              </div>

              <div className="py-2">
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="w-44 h-12 text-center font-mono font-semibold text-2xl tracking-widest bg-slate-50 border-2 border-red-500 rounded-2xl mx-auto focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">Demo test code: 123456</p>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>Paying: <b>{MONEY(Number(payAmount) || 0)}</b></span>
                <span className="font-mono text-emerald-600 font-bold">Expires in 01:54</span>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOtpModal(false)}
                  className="flex-1 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmOtpPayment}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  Confirm &amp; Pay
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

