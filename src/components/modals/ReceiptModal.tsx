"use client";

import React from "react";
import { Printer, CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/ui";
import { useData } from "@/providers/data-provider";
import { MONEY } from "@/constants";
import type { Payment, Customer, Loan } from "@/types";

interface ReceiptModalProps {
  payment: Payment | null;
  onClose: () => void;
  customer?: Customer;
  loan?: Loan;
}

export function ReceiptModal({
  payment,
  onClose,
  customer: propCustomer,
  loan: propLoan,
}: ReceiptModalProps) {
  const { customers, loans } = useData();

  if (!payment) return null;

  const customer =
    propCustomer || customers.find((c) => c.id === payment.customerId);
  const loan = propLoan || loans.find((l) => l.id === payment.loanId);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal title="Repayment receipt" onClose={onClose} className="receipt-modal">
        {/* Printable Receipt Card Body */}
        <div
          id="official-receipt-print-area"
          className="printable-receipt-card p-5 bg-slate-50 rounded-2xl space-y-3.5 text-xs border-2 border-slate-200 font-mono text-slate-800"
        >
          {/* Top Receipt Watermark / Header */}
          <div className="text-center pb-2 border-b border-slate-200">
            <p className="font-sans font-semibold text-xs text-slate-900 uppercase tracking-widest">
              PSI ONE MICROFINANCE (PVT) LTD
            </p>
            <p className="text-[11px] text-slate-600 font-sans mt-0.5">
              Loan repayment receipt
            </p>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-200">
            <span className="text-slate-700 font-bold">RECEIPT NO</span>
            <span className="font-semibold text-slate-900 text-sm">
              {payment.receiptNo || payment.id}
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-200">
            <span className="text-slate-700 font-bold">PAYMENT DATE</span>
            <span className="font-bold text-slate-900">{payment.date}</span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-200">
            <span className="text-slate-700 font-bold">BORROWER</span>
            <div className="text-right">
              <span className="font-semibold text-slate-900 block">
                {customer?.fullName || customer?.name || "Customer"}
              </span>
              {customer?.nic && (
                <span className="text-[11px] text-slate-600 font-medium">
                  NIC: {customer.nic}
                </span>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-200">
            <span className="text-slate-700 font-bold">LOAN REFERENCE</span>
            <span className="font-bold text-slate-900">
              {loan?.loanNo || payment.loanId}
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-200">
            <span className="text-slate-700 font-bold">PAYMENT TYPE</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                payment.type === "Capital"
                  ? "bg-red-100 text-red-800 border border-red-300"
                  : payment.type === "Interest"
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : "bg-purple-100 text-purple-800 border border-purple-300"
              }`}
            >
              {payment.type} Payment
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-200">
            <span className="text-slate-700 font-bold">METHOD</span>
            <span className="font-bold text-slate-900">{payment.method || "Cash"}</span>
          </div>

          {payment.notes && (
            <div className="flex justify-between items-center py-1 border-b border-slate-200">
              <span className="text-slate-700 font-bold">REFERENCE</span>
              <span className="text-slate-800 text-[11px] text-right max-w-[200px] whitespace-pre-wrap">
                {payment.notes}
              </span>
            </div>
          )}

          {/* Big Amount Row */}
          <div className="flex justify-between items-center py-2 bg-white px-3 rounded-xl border border-slate-300 shadow-2xs">
            <span className="text-slate-900 font-semibold text-xs uppercase tracking-wide">
              AMOUNT RECEIVED
            </span>
            <span className="text-emerald-700 font-semibold text-base">
              {MONEY(payment.amount)}
            </span>
          </div>

          {/* Footer Signature Strip */}
          <div className="pt-2 text-[11px] text-slate-600 flex justify-between items-end border-t border-slate-200 font-sans">
            <div>
              <p className="font-bold text-slate-800">
                Collector: {payment.collectedBy || "Authorized Officer"}
              </p>
              <p className="text-[11px] text-slate-500">Payment record</p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                <CheckCircle2 size={12} /> Received
              </span>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="receipt-actions flex justify-between items-center pt-5 gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md"
          >
            <Printer size={15} /> Print Receipt
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Done
          </button>
        </div>
    </Modal>
  );
}

export default ReceiptModal;

