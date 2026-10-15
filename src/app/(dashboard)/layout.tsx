/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, Suspense } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { DataProvider } from "@/providers/data-provider";
import Sidebar from "@/components/layout/Sidebar";

function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Dynamic header breadcrumb name
  const pageTitle = React.useMemo(() => {
    if (pathname === "/" || pathname === "/dashboard") return "Dashboard Overview";
    if (pathname.startsWith("/customers/new")) return "Register Customer";
    if (pathname.startsWith("/customers/")) return "Borrower Profile";
    if (pathname === "/customers") return "Customer Directory";
    if (pathname === "/loans/new") return "Issue Loan Facility";
    if (pathname.startsWith("/loans/")) return "Loan Record";
    if (pathname === "/loans") return "Loans Directory";
    if (pathname.startsWith("/collections")) return "Today's Collections";
    if (pathname.startsWith("/arrears")) return "Delinquency & Arrears";
    if (pathname.startsWith("/reports")) return "Portfolio Analytics";
    if (pathname.startsWith("/settings")) return "System Settings";
    if (pathname.startsWith("/repayments")) return "Repayment Ledger";
    return "Portfolio Operations";
  }, [pathname]);

  return (
    <div className="flex h-screen bg-slate-100/80 overflow-hidden font-sans">
      {/* ── Desktop & Tablet Sidebar ───────────────────────────────────────── */}
      <div className="hidden md:flex shrink-0">
        <Sidebar />
      </div>

      {/* ── Mobile Sidebar Drawer & Overlay ─────────────────────────────────── */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs md:hidden flex"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-72 h-full flex flex-col shadow-2xl animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar isMobile onClose={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* ── Main Content Area ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between shadow-2xs z-10 shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            {/* Hamburger Button for Mobile */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 text-slate-700 hover:text-red-600 hover:bg-red-50 rounded-xl transition md:hidden cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu size={20} />
            </button>

            {/* Current Active Location */}
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="hidden sm:flex items-center space-x-2">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-red-600 font-mono">
                  PSI ONE
                </span>
                <span className="text-slate-300">/</span>
              </div>
              <h1 className="text-sm sm:text-base font-black text-slate-900 truncate tracking-tight">
                {pageTitle}
              </h1>
            </div>
          </div>

          {/* Right Header User Status */}
          <div className="flex items-center space-x-3 shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-black text-slate-900">Admin Officer</p>
              <p className="text-[11px] text-slate-600 font-semibold">Credit &amp; Recoveries</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 text-white flex items-center justify-center font-black text-xs shadow-md shadow-red-600/25 ring-2 ring-red-100">
              AD
            </div>
          </div>
        </header>

        {/* Dynamic Page Views */}
        <main className="flex-1 overflow-y-auto bg-slate-50 min-w-0">
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
    <DataProvider>
      <Suspense fallback={null}>
        <DashboardShell>{children}</DashboardShell>
      </Suspense>
    </DataProvider>
  );
}