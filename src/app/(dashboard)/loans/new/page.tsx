// src/app/(dashboard)/page.tsx
'use client';

import React from 'react';
import Link from 'next/link';

export default function DashboardHomePage() {
  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Welcome Banner */}
      <div className="bg-linear-to-r from-slate-900 via-blue-950 to-blue-900 rounded-2xl p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <span className="bg-blue-600/40 text-blue-300 text-xs font-semibold px-3 py-1 rounded-full border border-blue-500/30">
            PSI One Core System
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight">Loan Management Dashboard</h1>
          <p className="text-slate-300 text-sm max-w-xl">
            Streamline customer registrations, track capital & interest deductions, manage loan disbursements, and monitor real-time collections effortlessly.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/loans/new"
            className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-sm shadow-lg transition duration-200 flex items-center gap-2">
            <span>+ Issue New Loan</span>
          </Link>
          <Link
            href="#"
            className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold text-sm backdrop-blur-md transition duration-200 border border-white/10">
            View Reports
          </Link>
        </div>
      </div>

      {/* Financial Metrics Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Active Portfolio</p>
              <h3 className="text-2xl font-extrabold text-gray-800 mt-2">LKR 14,850,000</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl font-bold">📈</div>
          </div>
          <p className="text-xs text-green-600 font-semibold mt-4 flex items-center gap-1">
            <span>+12.5%</span> <span className="text-gray-400 font-normal">from last month</span>
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Today's Collections</p>
              <h3 className="text-2xl font-extrabold text-gray-800 mt-2">LKR 425,300</h3>
            </div>
            <div className="p-3 bg-green-50 text-green-600 rounded-xl font-bold">💵</div>
          </div>
          <p className="text-xs text-green-600 font-semibold mt-4 flex items-center gap-1">
            <span>98.2%</span> <span className="text-gray-400 font-normal">collection efficiency</span>
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Registered Customers</p>
              <h3 className="text-2xl font-extrabold text-gray-800 mt-2">1,482</h3>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl font-bold">👥</div>
          </div>
          <p className="text-xs text-purple-600 font-semibold mt-4 flex items-center gap-1">
            <span>+24</span> <span className="text-gray-400 font-normal">newly added today</span>
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Pending Approvals</p>
              <h3 className="text-2xl font-extrabold text-amber-600 mt-2">8 Loans</h3>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl font-bold">⏳</div>
          </div>
          <p className="text-xs text-amber-600 font-semibold mt-4 flex items-center gap-1">
            <span>Requires Action</span>
          </p>
        </div>
      </div>

      {/* Quick Access & Recent Activities Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions Panel */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 lg:col-span-1">
          <h3 className="font-bold text-gray-800 text-lg border-b pb-3">Quick Navigation</h3>
          <div className="space-y-2">
            <Link 
              href="/loans/new" 
              className="flex items-center justify-between p-3.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-sm transition">
              <span>💰 Create New Loan Wizard</span>
              <span>→</span>
            </Link>
            <Link 
              href="#" 
              className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 text-gray-700 hover:bg-gray-100 font-medium text-sm transition">
              <span>👥 Register New Customer</span>
              <span>→</span>
            </Link>
            <Link 
              href="#" 
              className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 text-gray-700 hover:bg-gray-100 font-medium text-sm transition">
              <span>📊 Daily Collection Reports</span>
              <span>→</span>
            </Link>
            <Link 
              href="#" 
              className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 text-gray-700 hover:bg-gray-100 font-medium text-sm transition">
              <span>⚙️ System Deductions Config</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        {/* Recent Loan Activities Table Preview */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 lg:col-span-2">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="font-bold text-gray-800 text-lg">Recent Loan Transactions</h3>
            <span className="text-xs text-blue-600 font-semibold cursor-pointer hover:underline">View All</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-400 uppercase text-xs">
                <tr>
                  <th className="p-3 rounded-l-lg">Customer</th>
                  <th className="p-3">Loan ID</th>
                  <th className="p-3">Gross Amount</th>
                  <th className="p-3">Frequency</th>
                  <th className="p-3 rounded-r-lg">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="p-3 font-semibold text-gray-800">K. A. Nimal Perera</td>
                  <td className="p-3 text-xs font-mono">LN-2026-001</td>
                  <td className="p-3 font-medium">LKR 100,000</td>
                  <td className="p-3">Monthly</td>
                  <td className="p-3"><span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">Active</span></td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-gray-800">S. A. Sunil Silva</td>
                  <td className="p-3 text-xs font-mono">LN-2026-002</td>
                  <td className="p-3 font-medium">LKR 50,000</td>
                  <td className="p-3">Weekly</td>
                  <td className="p-3"><span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">Active</span></td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-gray-800">M. R. Kamal Fernando</td>
                  <td className="p-3 text-xs font-mono">LN-2026-003</td>
                  <td className="p-3 font-medium">LKR 250,000</td>
                  <td className="p-3">Monthly</td>
                  <td className="p-3"><span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">Pending</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}