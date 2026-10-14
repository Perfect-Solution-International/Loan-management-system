"use client";
import React, { Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useData } from "@/providers/data-provider";
import { MONEY } from "@/constants";
import type { Loan, Customer, Payment } from "@/types";

function LoanDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const { loans, customers, payments } = useData();

  const loanId = ((params?.loanId as string) || (params?.id as string));
  const loan = loans.find((l: Loan) => l.id === loanId);
  const customer = customers.find((c: Customer) => c.id === loan?.customerId);
  const loanPayments = payments.filter((p: Payment) => p.loanId === loanId);

  if (!loan) {
    return (
      <div className="p-6 space-y-4">
        <div className="panel">
          <h2>Loan not found</h2>
          <p className="subheading">The requested loan record does not exist or has been removed.</p>
          <div style={{ marginTop: 16 }}>
            <Link href="/loans" className="btn secondary">
              <ArrowLeft size={15} /> Back to Loans
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const totalPaid = loanPayments.reduce((sum: number, p: Payment) => sum + p.amount, 0);
  const balanceDue = Math.max(0, loan.totalRepayment - totalPaid);

  function handleDelete() {
    if (confirm("Are you sure you want to delete this loan record?")) {
      router.push("/loans");
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="page-heading">
        <div>
          <p className="eyebrow">LOANS / DETAILS</p>
          <h1>Loan Record: {loan.id}</h1>
          <p className="subheading">Detailed breakdown of loan terms, repayments, and borrower status.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/loans" className="btn secondary">
            <ArrowLeft size={15} /> Back to Loans
          </Link>
          <button className="btn secondary" style={{ color: "#c84b5d", borderColor: "#c84b5d" }} onClick={handleDelete}>
            <Trash2 size={15} /> Delete
          </button>
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="panel space-y-4">
          <div className="panel-heading">
            <div>
              <h2>Loan Summary</h2>
              <p>Core financial figures</p>
            </div>
            <span className={`pill ${loan.status.toLowerCase()}`}>{loan.status}</span>
          </div>

          <div className="calc-grid">
            <div className="calc-item">
              <span>Gross Principal</span>
              <strong>{MONEY(loan.principal)}</strong>
            </div>
            <div className="calc-item">
              <span>Interest Rate</span>
              <strong>{loan.interestRate}% ({loan.ratePeriod})</strong>
            </div>
            <div className="calc-item">
              <span>Total Interest</span>
              <strong>{MONEY(loan.interest)}</strong>
            </div>
            <div className="calc-item">
              <span>Total Repayment</span>
              <strong>{MONEY(loan.totalRepayment)}</strong>
            </div>
            <div className="calc-item">
              <span>Net Disbursement</span>
              <strong>{MONEY(loan.netDisbursement)}</strong>
            </div>
            <div className="calc-item">
              <span>Installment Amount</span>
              <strong>{MONEY(loan.installment)}</strong>
            </div>
            <div className="calc-item">
              <span>Total Paid</span>
              <strong style={{ color: "#20a17b" }}>{MONEY(totalPaid)}</strong>
            </div>
            <div className="calc-item">
              <span>Balance Due</span>
              <strong style={{ color: "#c84b5d" }}>{MONEY(balanceDue)}</strong>
            </div>
          </div>
        </section>

        <section className="panel space-y-4">
          <div className="panel-heading">
            <div>
              <h2>Borrower Information</h2>
              <p>Associated customer profile</p>
            </div>
          </div>
          {customer ? (
            <div className="profile-head">
              <div className="profile-avatar">
                {customer.name.split(" ").map((x: string) => x[0]).slice(0, 2).join("")}
              </div>
              <div style={{ flex: 1 }}>
                <h3>{customer.name}</h3>
                <p className="subheading">{customer.id} · NIC {customer.nic}</p>
                <p className="small-muted" style={{ marginTop: 4 }}>Phone: {customer.phone}</p>
                <p className="small-muted">Address: {customer.address}, {customer.town}</p>
                <div style={{ marginTop: 8 }}>
                  <Link href={`/customers/${customer.id}`} className="text-link">View Full Profile →</Link>
                </div>
              </div>
            </div>
          ) : (
            <p className="small-muted">Customer details not found.</p>
          )}

          <div className="notice" style={{ marginTop: 20 }}>
            <strong>Schedule Info:</strong> Frequency: {loan.repaymentFrequency} · Duration: {loan.duration} periods · First payment: {loan.firstPaymentDate}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Repayment History</h2>
            <p>Recorded payments for this loan</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>PAYMENT ID</th>
                <th>DATE</th>
                <th>TYPE</th>
                <th>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {loanPayments.map((p: Payment) => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>{p.date}</td>
                  <td>{p.type}</td>
                  <td className="main-text">{MONEY(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {loanPayments.length === 0 && (
            <div className="empty-state">No payments recorded for this loan yet.</div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function LoanDetailsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 text-xs">Loading loan record...</div>}>
      <LoanDetailsContent />
    </Suspense>
  );
}