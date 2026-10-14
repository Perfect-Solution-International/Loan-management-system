"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut, CheckCircle2 } from "lucide-react";
import { DataProvider } from "@/providers/data-provider";

interface NavItem {
  name: string;
  href: string;
  icon: string;
}

const navItems: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: "🏠" },
  { name: "Customer Directory", href: "/customers", icon: "👥" },
  { name: "Loans List", href: "/loans", icon: "💳" },
  { name: "Issue New Loan", href: "/loans/new", icon: "💰" },
  { name: "Daily Collections", href: "/repayments", icon: "📊" },
  { name: "Reports & Analytics", href: "/reports", icon: "📈" },
  { name: "System Settings", href: "/settings", icon: "⚙️" },
];

function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
      {/* ── Desktop & Tablet Sidebar ───────────────────────────────────────── */}
      <aside className="w-64 bg-slate-950 text-slate-200 hidden md:flex md:flex-col shrink-0 shadow-2xl border-r border-slate-850">
        {/* Brand Header */}
        <div className="p-5 text-xl font-bold text-white border-b border-slate-800 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-base shadow-lg shadow-blue-600/30">
            PSI
          </div>
          <div className="flex flex-col">
            <span className="text-base font-black tracking-tight leading-tight text-white">
              PSI One LMS
            </span>
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              Loan Management System
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3.5 space-y-1.5 overflow-y-auto text-sm">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/" || pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl font-bold transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800/90 space-y-3">
          <div className="flex items-center justify-between px-3 py-2 bg-slate-900 rounded-xl text-xs font-semibold text-slate-300 border border-slate-800">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-slate-300">System Status</span>
            </div>
            <span className="text-emerald-400 font-bold">ONLINE</span>
          </div>

          <Link
            href="/login"
            className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-bold text-slate-400 hover:text-red-400 hover:bg-slate-900 rounded-xl transition"
          >
            <LogOut size={13} /> Sign Out
          </Link>
        </div>
      </aside>

      {/* ── Mobile Sidebar Drawer & Overlay ─────────────────────────────────── */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs md:hidden flex"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-72 bg-slate-950 text-slate-200 h-full flex flex-col shadow-2xl p-4 animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Brand + Close */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-sm">
                  PSI
                </div>
                <div>
                  <p className="text-sm font-black text-white">PSI One LMS</p>
                  <p className="text-[10px] text-slate-400">Loan Management</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                aria-label="Close navigation menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Mobile Nav Links */}
            <nav className="flex-1 py-4 space-y-1.5 overflow-y-auto">
              {navItems.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/" || pathname === "/dashboard"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition ${
                      isActive
                        ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                        : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Mobile Footer */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-bold text-slate-400 hover:text-red-400 hover:bg-slate-900 rounded-xl transition"
              >
                <LogOut size={13} /> Sign Out
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content Area (Mobile, Tablet & Desktop) ─────────────────────── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shadow-2xs z-10 shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            {/* Hamburger Button for Mobile */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition md:hidden cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-sm sm:text-base font-black text-slate-900 truncate tracking-tight">
              PSI One Loan Management Portal
            </h1>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-900">Admin Officer</p>
              <p className="text-[11px] text-slate-600 font-medium">Loan Department</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-md shadow-blue-600/20">
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