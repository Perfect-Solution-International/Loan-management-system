"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Plus, Search, Users, Phone, MapPin, Eye } from "lucide-react";
import { useData } from "@/providers/data-provider";
import { MONEY } from "@/constants";
import type { Customer } from "@/types";

export default function CustomersDirectoryPage() {
  const { customers } = useData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filteredCustomers = customers.filter((c: Customer) => {
    const matchesSearch =
      (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.fullName || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.nic || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.phone || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.town || "").toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" ||
      (c.status || "").toUpperCase() === statusFilter.toUpperCase();

    return matchesSearch && matchesStatus;
  });

  const activeCount = customers.filter(
    (c: Customer) => (c.status || "").toUpperCase() === "ACTIVE"
  ).length;

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">
            PORTFOLIO / DIRECTORY
          </p>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Customer Directory
          </h1>
          <p className="text-xs text-slate-500">
            View, search, and manage registered borrower profiles and credit history.
          </p>
        </div>
        <Link
          href="/customers/new"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
        >
          <Plus size={16} /> Register New Customer
        </Link>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Customers
            </p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {customers.length}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">In database records</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Users size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Active Borrowers
            </p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">
              {activeCount}
            </h3>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
              Eligible for disbursements
            </p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Users size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Avg. Monthly Income
            </p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {MONEY(
                customers.length
                  ? Math.round(
                      customers.reduce(
                        (acc: number, c: Customer) =>
                          acc + (c.monthlyIncome || 0),
                        0
                      ) / customers.length
                    )
                  : 0
              )}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Self-reported income
            </p>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Users size={22} />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search by name, NIC, phone, town..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto overflow-x-auto">
          {["ALL", "ACTIVE", "INACTIVE", "SUSPENDED"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                statusFilter === s
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-xs text-slate-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Customer</th>
                <th className="py-3.5 px-6">NIC Number</th>
                <th className="py-3.5 px-6">Contact Phone</th>
                <th className="py-3.5 px-6">Town / District</th>
                <th className="py-3.5 px-6">Monthly Income</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredCustomers.map((c: Customer) => {
                const initials = (c.name || "Customer")
                  .split(" ")
                  .map((x) => x[0])
                  .slice(0, 2)
                  .join("");

                return (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {initials}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 leading-tight">
                            {c.name}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {c.id}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-6 text-xs font-mono font-medium text-slate-700">
                      {c.nic}
                    </td>
                    <td className="py-3.5 px-6 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Phone size={13} className="text-slate-400" />
                        <span>{c.phone}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-6 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <MapPin size={13} className="text-slate-400" />
                        <span>
                          {c.town || "—"}, {c.district || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-6 font-semibold text-xs text-slate-900">
                      {MONEY(c.monthlyIncome || 0)}
                    </td>
                    <td className="py-3.5 px-6">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          (c.status || "").toUpperCase() === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {c.status || "Active"}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <Link
                        href={`/customers/${c.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                      >
                        <Eye size={13} /> View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredCustomers.length === 0 && (
            <div className="p-12 text-center text-slate-400 text-xs space-y-2">
              <Users size={32} className="mx-auto text-slate-300" />
              <p className="font-semibold text-slate-600 text-sm">
                No customers found
              </p>
              <p>Try adjusting your search query or filter options.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}