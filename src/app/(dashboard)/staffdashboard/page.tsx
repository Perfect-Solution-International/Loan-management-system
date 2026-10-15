import React, { Suspense } from "react";
import { DashboardPage } from "@/modules/dashboard/dashboard-page";

export const metadata = {
  title: "Staff Dashboard | Microfinance Operations",
  description: "Field collection schedule, assigned borrowers, repayments, and daily operational targets.",
};

export default function StaffDashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-medium">Loading staff dashboard...</div>}>
      <DashboardPage initialRole="staff" />
    </Suspense>
  );
}

