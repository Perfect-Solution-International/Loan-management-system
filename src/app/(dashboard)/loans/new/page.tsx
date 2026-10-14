"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { NewLoanForm } from "@/components/forms/NewLoanForm";

function IssueNewLoanContent() {
  const searchParams = useSearchParams();
  const preselectedId = searchParams.get("customerId") || "";

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* Page Header */}
      <div className="bg-white border-b border-slate-200/80 px-4 sm:px-8 py-5 sticky top-0 z-20 shadow-2xs">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest">
              PORTFOLIO OPERATIONS / NEW LOAN CONTRACT
            </p>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              Create Loan Application
            </h1>
            <p className="text-xs text-slate-500">
              Select a customer from the dropdown to auto-populate basic details, then set loan parameters and guarantor details.
            </p>
          </div>
          <Link
            href="/loans"
            className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition shadow-xs"
          >
            <ArrowLeft size={14} /> Back to Loans Directory
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-6">
        <NewLoanForm initialCustomerId={preselectedId} />
      </div>
    </div>
  );
}

export default function IssueNewLoanPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-slate-500 text-xs">
          Loading loan creation workflow...
        </div>
      }
    >
      <IssueNewLoanContent />
    </Suspense>
  );
}