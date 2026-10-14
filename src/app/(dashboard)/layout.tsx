/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import { DataProvider } from "@/providers/data-provider";
import { BrandLogo } from "@/components/brand-logo";

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
  { name: "Open Today's Collection", href: "/collections", icon: "📅" },
  { name: "Arrears", href: "/arrears", icon: "⚠️" },
  { name: "Reports & Analytics", href: "/reports", icon: "📈" },
  { name: "System Settings", href: "/settings", icon: "⚙️" },
];

function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
      {/* ── Desktop & Tablet Sidebar ───────────────────────────────────────── */}
      <aside className="w-64 bg-[#09090b] text-zinc-200 hidden md:flex md:flex-col shrink-0 shadow-2xl border-r border-zinc-800">
        {/* Brand Header */}
        <div className="p-5 border-b border-zinc-850">
          <BrandLogo href="/dashboard" size="md" theme="dark" />
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
                    ? "bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md shadow-red-600/25"
                    : "text-zinc-300 hover:bg-zinc-850 hover:text-white"
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
              <BrandLogo href="/dashboard" size="sm" theme="dark" />
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
                        ? "bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md shadow-red-600/25"
                        : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Mobile Footer */}
            <div className="pt-3 border-t border-zinc-800 space-y-2">
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-bold text-zinc-400 hover:text-red-400 hover:bg-zinc-900 rounded-xl transition"
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
        <header className="h-16 bg-white border-b border-zinc-200 px-4 sm:px-6 flex items-center justify-between shadow-2xs z-10 shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            {/* Hamburger Button for Mobile */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 text-zinc-700 hover:text-red-600 hover:bg-red-50 rounded-xl transition md:hidden cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center space-x-2.5 min-w-0">
              <img
                src="/logos/psi-logo.png"
                alt="PSI Logo"
                className="w-8 h-8 object-contain shrink-0 drop-shadow-xs"
              />
              <h1 className="text-sm sm:text-base font-black text-zinc-900 truncate tracking-tight">
                PSI One Loan Management System
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-zinc-900">Admin Officer</p>
              <p className="text-[11px] text-zinc-600 font-medium">Loan Department</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-red-600 text-white flex items-center justify-center font-black text-xs shadow-md shadow-red-600/20">
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