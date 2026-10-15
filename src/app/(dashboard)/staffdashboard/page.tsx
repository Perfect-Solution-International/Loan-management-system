import React, { Suspense } from "react";
import { StaffDashboard } from "@/modules/dashboard/staff-dashboard";

export const metadata = {
  title: "Staff Operations Dashboard | Microfinance Core",
  description: "Enterprise management console for staff authority, customer lifecycle, loan approvals, interest rules, repayments, and audit supervision.",
};

export default function StaffDashboardPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-700 font-semibold">Loading operations console...</div>}>
      <StaffDashboard />
    </Suspense>
  );
}

