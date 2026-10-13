// src/app/(dashboard)/layout.tsx
import React from 'react';
import Link from 'next/link';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-slate-300 hidden md:flex md:flex-col">
        <div className="p-5 text-xl font-bold text-white border-b border-slate-800 flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-sm">
            PSI
          </div>
          <span>PSI One Loans</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 text-sm">
          <Link href="/loans/new" className="block px-4 py-2.5 rounded-xl hover:bg-slate-800 hover:text-white transition font-medium">
            💰 Issue New Loan
          </Link>
          <Link href="#" className="block px-4 py-2.5 rounded-xl hover:bg-slate-800 hover:text-white transition font-medium">
            👥 Customer Directory
          </Link>
          <Link href="#" className="block px-4 py-2.5 rounded-xl hover:bg-slate-800 hover:text-white transition font-medium">
            📊 Daily Collections
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="text-center w-full py-2 bg-slate-800 text-slate-400 rounded-lg text-xs font-semibold">
            System Active
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b px-6 flex items-center justify-between shadow-sm">
          <h1 className="text-base font-semibold text-gray-800">PSI One Loan Management Portal</h1>
          <div className="flex items-center space-x-3">
            <span className="text-xs font-medium text-gray-600">Admin Officer</span>
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
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