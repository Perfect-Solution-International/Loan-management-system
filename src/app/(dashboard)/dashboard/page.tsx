import React, { Suspense } from "react";
import { DashboardPage } from "@/modules/dashboard/dashboard-page";

export const metadata = {
  title: "Admin Executive Dashboard | Microfinance Portfolio",
  description: "Executive overview of loan portfolio, regulatory health, Committee approvals and field operations.",
};

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-medium">Loading executive dashboard...</div>}>
      <DashboardPage initialRole="admin" />
    </Suspense>
  );
}
