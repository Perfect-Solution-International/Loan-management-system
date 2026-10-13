"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DataProvider } from "@/providers/data-provider";

interface NavItem {
  name: string;
  href: string;
  icon: string;
}

const navItems: NavItem[] = [
  { name: "Dashboard", href: "/", icon: "🏠" },
  { name: "Customer Directory", href: "/customers", icon: "👥" },
  { name: "Loans List", href: "/loans", icon: "💳" },
  { name: "Issue New Loan", href: "/loans/new", icon: "💰" },
  { name: "Daily Collections", href: "/repayments", icon: "📊" },
  { name: "Reports & Analytics", href: "/reports", icon: "📈" },
  { name: "System Settings", href: "/settings", icon: "⚙️" },
];

function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-slate-300 hidden md:flex md:flex-col shadow-xl">
        {/* Brand Header */}
        <div className="p-5 text-xl font-bold text-white border-b border-slate-800 flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-base shadow-sm">
            PSI
          </div>
          <div className="flex flex-col">
            <span className="text-base tracking-tight leading-tight">PSI One Loans</span>
            <span className="text-[10px] text-slate-400 font-normal uppercase tracking-wider">
              Management Portal
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto text-sm">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/" || pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl font-medium transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md font-semibold"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between px-3 py-2 bg-slate-800/80 rounded-lg text-xs font-semibold text-slate-300">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>System Status</span>
            </div>
            <span className="text-emerald-400 font-bold">ONLINE</span>
          </div>

          <Link
            href="/login"
            className="flex items-center justify-center w-full px-3 py-2 text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
          >
            ← Sign Out
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b px-6 flex items-center justify-between shadow-xs z-10">
          <div className="flex items-center space-x-2">
            <h1 className="text-base font-semibold text-gray-800">
              PSI One Loan Management Portal
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-gray-800">Admin Officer</p>
              <p className="text-[11px] text-gray-500">Loan Department</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow">
              AD
            </div>
          </div>
        </header>

        {/* Dynamic Page Views */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
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