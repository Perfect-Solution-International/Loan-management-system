"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronRight, Database, Menu } from "lucide-react";
import { DataProvider } from "@/providers/data-provider";
import Sidebar from "@/components/layout/Sidebar";
import { LoadingState, Modal } from "@/components/ui";

const labels: Record<string, string> = {
  dashboard: "Overview",
  customers: "Customers",
  loans: "Loans",
  new: "Create",
  edit: "Edit profile",
  schedule: "Repayment schedule",
  repayments: "Repayments",
  reports: "Reports",
  settings: "Settings",
  staff: "Staff & roles",
  "audit-logs": "Audit logs",
  collections: "Collections",
  overdue: "Overdue loans",
  documents: "Documents",
};

function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const staffActive =
    pathname === "/staff" ||
    (pathname === "/settings" && searchParams.get("tab") === "staff");
  const [mobileOpen, setMobileOpen] = useState(false);
  const segments = pathname.split("/").filter(Boolean);
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Sidebar staffActive={staffActive} />
      {mobileOpen && (
        <Modal
          title="Navigation"
          onClose={() => setMobileOpen(false)}
          className="mobile-nav-dialog"
        >
          <Sidebar
            mobile
            staffActive={staffActive}
            onNavigate={() => setMobileOpen(false)}
          />
        </Modal>
      )}
      <div className="app-workspace">
        <header className="app-topbar">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              className="icon-button md:hidden"
              aria-label="Open navigation"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={19} />
            </button>
            <nav className="breadcrumbs" aria-label="Breadcrumb">
              <Link href="/" className="hidden sm:inline">
                Workspace
              </Link>
              <ChevronRight size={13} className="hidden sm:inline" />
              {!segments.length ? (
                <span>Overview</span>
              ) : (
                segments.map((segment, i) => (
                  <span
                    className="inline-flex items-center gap-2"
                    key={segment}
                  >
                    {i > 0 && <ChevronRight size={12} />}
                    {i < segments.length - 1 ? (
                      <Link href={`/${segments.slice(0, i + 1).join("/")}`}>
                        {labels[segment] || segment}
                      </Link>
                    ) : (
                      <span aria-current="page">
                        {labels[segment] || segment}
                      </span>
                    )}
                  </span>
                ))
              )}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-500 hidden lg:block">
              Sri Lanka · LKR
            </span>
            <span className="demo-tag">
              <Database size={12} />
              Demo workspace
            </span>
          </div>
        </header>
        <div className="prototype-banner">
          <Database size={13} />
          <p>
            Demo records and changes stay in this browser. Authentication and
            shared storage are not connected.
          </p>
        </div>
        <main id="main-content" tabIndex={-1} className="min-w-0 outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DataProvider><Suspense fallback={<LoadingState />}>
      <DashboardShell>{children}</DashboardShell>
    </Suspense></DataProvider>
  );
}
