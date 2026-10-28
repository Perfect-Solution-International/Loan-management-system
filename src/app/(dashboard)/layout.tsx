/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Bell, BellRing, CheckCircle2, ArrowRight } from "lucide-react";
import { useData } from "@/providers/data-provider";
import Sidebar from "@/components/layout/Sidebar";

function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loans } = useData();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Pending loans count for live notification badge (Admin view only)
  const pendingLoans = useMemo(
    () => loans.filter((l) => (l.status || "").toLowerCase() === "pending"),
    [loans]
  );

  // Overdue loans count for field recovery (Staff view only)
  const overdueLoans = useMemo(
    () => loans.filter((l) => (l.status || "").toLowerCase() === "overdue"),
    [loans]
  );

  // Dynamic header breadcrumb name
  const pageTitle = React.useMemo(() => {
    if (pathname === "/" || pathname === "/dashboard") return "Dashboard";
    if (pathname === "/staffdashboard") return "Staff Dashboard";
    if (pathname.startsWith("/customers/new")) return "New Customer";
    if (pathname.startsWith("/customers/")) return "Customer Profile";
    if (pathname === "/customers") return "Customer Directory";
    if (pathname === "/loans/new") return "New Loan";
    if (pathname.startsWith("/loans/")) return "Loan Details";
    if (pathname === "/loans") return "Loan Register";
    if (pathname.startsWith("/collections")) return "Today's Collections";
    if (pathname.startsWith("/overdue")) return "Overdue Payments & Recovery";
    if (pathname.startsWith("/arrears")) return "Delinquency & Arrears";
    if (pathname.startsWith("/reports")) return "Financial Reporting";
    if (pathname.startsWith("/audit-logs")) return "Activity & Audit Trail";
    if (pathname.startsWith("/settings")) return "System Settings";
    if (pathname.startsWith("/users")) return "User Management";
    if (pathname.startsWith("/staff")) return "Staff Members";
    if (pathname.startsWith("/repayments")) return "Repayment Ledger";
    if (pathname.startsWith("/online-payments")) return "Online Payment Slips";
    return "Portfolio Operations";
  }, [pathname]);

  const isStaffView = pathname === "/staffdashboard";

  // Role-appropriate notification count
  const notificationCount = isStaffView ? overdueLoans.length : pendingLoans.length;

  return (
    <div className="dashboard-shell flex h-dvh bg-slate-100/80 overflow-hidden font-sans">
      <a className="skip-link" href="#main-content">Skip to main content</a>
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
        <header className="workspace-header h-16 bg-white border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between gap-3 shadow-2xs z-10 shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            {/* Hamburger Button for Mobile */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 text-slate-700 hover:text-red-600 hover:bg-red-50 rounded-xl transition md:hidden cursor-pointer"
              aria-label="Open navigation menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="workspace-navigation"
            >
              <Menu size={19} />
            </button>

            {/* Current Active Location */}
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="hidden sm:flex items-center space-x-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-red-600 font-mono">
                  PSI ONE
                </span>
                <span className="text-slate-300">/</span>
              </div>
              <h1 className="text-sm sm:text-base font-semibold text-slate-900 truncate tracking-tight">
                {pageTitle}
              </h1>
            </div>
          </div>

          {/* Right Header: Notification Bell (Admin Only) & User Status */}
          <div className="flex items-center space-x-3 shrink-0">
            {/* Notification Bell Dropdown - Exclusively for Admin Dashboard */}
            {!isStaffView && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                  title="Admin Notifications"
                  aria-label="View admin notifications"
                  aria-expanded={notificationsOpen}
                  aria-controls="workspace-notifications"
                >
                  {pendingLoans.length > 0 ? (
                    <BellRing size={20} className="text-red-600" />
                  ) : (
                    <Bell size={20} />
                  )}
                  {pendingLoans.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[11px] font-semibold rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                      {pendingLoans.length}
                    </span>
                  )}
                </button>

                {/* Notification Popover Dropdown */}
                {notificationsOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setNotificationsOpen(false)}
                    />
                    <div id="workspace-notifications" className="notification-popover absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <Bell size={16} className="text-red-600" />
                          <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                            Admin Approval Notifications
                          </span>
                        </div>
                        {pendingLoans.length > 0 && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                            {pendingLoans.length} Action Required
                          </span>
                        )}
                      </div>

                      {pendingLoans.length > 0 ? (
                        <div className="space-y-2">
                          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2.5">
                            <div className="flex items-start gap-2.5">
                              <span className="w-2 h-2 rounded-full bg-red-600 shrink-0 mt-1.5 animate-ping" />
                              <div>
                                <p className="text-xs font-semibold text-slate-900">
                                  {pendingLoans.length} Loan Application{pendingLoans.length > 1 ? "s" : ""} Awaiting Approval
                                </p>
                                <p className="text-[11px] text-slate-600 font-medium leading-relaxed mt-0.5">
                                  Review the application details before making an approval decision.
                                </p>
                              </div>
                            </div>
                            <Link
                              href={`/loans/${pendingLoans[0]?.id || ""}`}
                              onClick={() => setNotificationsOpen(false)}
                              className="w-full inline-flex items-center justify-center gap-1.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition shadow-xs"
                            >
                              <span>Review &amp; Approve</span>
                              <ArrowRight size={13} />
                            </Link>
                          </div>
                        </div>
                      ) : (
                        <div className="py-6 text-center text-xs text-slate-500">
                          <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-2" />
                          <p className="font-semibold text-slate-700">All caught up!</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">No pending approval requests.</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

          </div>
        </header>
        <div id="main-content" role="main" tabIndex={-1} className="workspace-content flex-1 min-h-0 min-w-0 overflow-y-auto outline-none">
          {children}
        </div>
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
    <Suspense fallback={null}>
      <DashboardShell>{children}</DashboardShell>
    </Suspense>
  );
}
