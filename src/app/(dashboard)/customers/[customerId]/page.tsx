"use client";
import React, { Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { useData } from "@/providers/data-provider";
import { MONEY } from "@/constants";
import type { Customer, Loan } from "@/types";

function CustomerDetailsContent() {
  const params = useParams<{ customerId?: string; id?: string }>();
  const customerId = params?.customerId || params?.id;
  const { customers, loans } = useData();
  const c = customers.find((x: Customer) => x.id === customerId);

  if (!c) {
    return (
      <>
        <div className="page-heading">
          <div>
            <h1>Customer not found</h1>
            <p className="subheading">This customer may not exist in the current demo session.</p>
          </div>
          <Link href="/customers" className="btn secondary">
            <ArrowLeft size={15} /> Customers
          </Link>
        </div>
      </>
    );
  }

  const customerLoans = loans.filter((l: Loan) => l.customerId === c.id);

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">CUSTOMERS / PROFILE</p>
          <h1>{c.name}</h1>
          <p className="subheading">{c.id} · Registered {c.registeredAt || "N/A"}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/customers" className="btn secondary">
            <ArrowLeft size={15} /> Back
          </Link>
          <Link href={`/loans/new?customerId=${c.id}`} className="btn">
            <Plus size={15} /> New Loan
          </Link>
        </div>
      </div>

      <section className="panel">
        <div className="profile-head">
          <div className="profile-avatar">
            {c.name.split(" ").map((x: string) => x[0]).slice(0, 2).join("")}
          </div>
          <div>
            <h3>{c.name}</h3>
            <p className="subheading">{c.nic} · {c.phone}</p>
            <div style={{ marginTop: 8 }}>
              <span className={`pill ${c.status.toLowerCase()}`}>{c.status}</span>
            </div>
          </div>
        </div>

        <div className="profile-grid">
          {[
            ["Customer ID", c.id],
            ["NIC / ID", c.nic],
            ["Date of birth", c.dob || "Not provided"],
            ["Gender", c.gender || "Not provided"],
            ["Address", c.address || "Not provided"],
            ["Village / Town", `${c.village || "—"} / ${c.town || "—"}`],
            ["District", c.district || "Not provided"],
            ["Primary contact", c.phone],
            ["Email", c.email || "Not provided"],
            ["Occupation", c.occupation || "Not provided"],
            ["Monthly income", MONEY(c.monthlyIncome)],
            ["Emergency contact", c.emergencyContact || "Not provided"],
          ].map(([label, value]) => (
            <div className="profile-item" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Loan History</h2>
            <p>Current and previous loans for this customer</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>LOAN ID</th>
                <th>PRINCIPAL</th>
                <th>FREQUENCY</th>
                <th>INSTALLMENT</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {customerLoans.map((l: Loan) => (
                <tr key={l.id}>
                  <td>{l.id}</td>
                  <td>{MONEY(l.principal)}</td>
                  <td>{l.repaymentFrequency}</td>
                  <td>{MONEY(l.installment)}</td>
                  <td>
                    <span className={`pill ${l.status.toLowerCase()}`}>
                      {l.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!customerLoans.length && (
            <div className="empty-state">No loans linked to this customer.</div>
          )}
        </div>
      </section>
    </>
  );
}

export default function CustomerDetailsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 text-xs">Loading customer profile...</div>}>
      <CustomerDetailsContent />
    </Suspense>
  );
}