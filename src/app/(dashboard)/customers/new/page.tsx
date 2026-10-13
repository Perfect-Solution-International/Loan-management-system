"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserPlus, CheckCircle2 } from "lucide-react";
import { useData } from "@/providers/data-provider";
import type { Customer } from "@/types";

export default function NewCustomerPage() {
  const router = useRouter();
  const { addCustomer } = useData();

  const [form, setForm] = useState({
    fullName: "",
    nic: "",
    phone: "",
    email: "",
    dob: "",
    gender: "Male",
    address: "",
    village: "",
    town: "",
    district: "Colombo",
    occupation: "",
    monthlyIncome: "",
    emergencyContact: "",
  });

  const [submitted, setSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.nic || !form.phone) return;

    const newCust: Customer = {
      id: `CUST-${Date.now().toString().slice(-4)}`,
      name: form.fullName,
      fullName: form.fullName,
      nic: form.nic,
      phone: form.phone,
      email: form.email || undefined,
      dob: form.dob || undefined,
      gender: form.gender,
      address: form.address || "Main Street",
      village: form.village || "Zone 1",
      town: form.town || "Colombo",
      district: form.district || "Colombo",
      occupation: form.occupation || "Self-Employed",
      monthlyIncome: Number(form.monthlyIncome) || 50000,
      emergencyContact: form.emergencyContact || undefined,
      status: "Active",
      registeredAt: new Date().toISOString().slice(0, 10),
    };

    addCustomer(newCust);
    setSubmitted(true);

    setTimeout(() => {
      router.push("/customers");
    }, 1200);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">
            CUSTOMERS / REGISTRATION
          </p>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Register New Customer
          </h1>
          <p className="text-xs text-slate-500">
            Enter borrower personal, contact, and identity details for verification.
          </p>
        </div>
        <Link
          href="/customers"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-xs transition"
        >
          <ArrowLeft size={14} /> Back to Directory
        </Link>
      </div>

      {submitted && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm font-semibold">
          <CheckCircle2 className="text-emerald-600" size={20} />
          Customer profile registered successfully! Redirecting to directory...
        </div>
      )}

      {/* Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Identity Section */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4">
              1. Personal & Identity Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Full Legal Name *
                </label>
                <input
                  type="text"
                  name="fullName"
                  required
                  placeholder="e.g. Sunil Shantha Perera"
                  value={form.fullName}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  National Identity Card (NIC) *
                </label>
                <input
                  type="text"
                  name="nic"
                  required
                  placeholder="e.g. 199012345678 or 901234567V"
                  value={form.nic}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  name="dob"
                  value={form.dob}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Gender
                </label>
                <select
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contact & Location Section */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4">
              2. Contact & Residence Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Primary Mobile Phone *
                </label>
                <input
                  type="tel"
                  name="phone"
                  required
                  placeholder="e.g. 077 123 4567"
                  value={form.phone}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="e.g. customer@example.com"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Residential Address
                </label>
                <input
                  type="text"
                  name="address"
                  placeholder="Street / House No."
                  value={form.address}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Village / Zone
                </label>
                <input
                  type="text"
                  name="village"
                  placeholder="e.g. Welisara"
                  value={form.village}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Town / City
                </label>
                <input
                  type="text"
                  name="town"
                  placeholder="e.g. Ragama"
                  value={form.town}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  District
                </label>
                <input
                  type="text"
                  name="district"
                  placeholder="e.g. Gampaha"
                  value={form.district}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Emergency Contact Phone
                </label>
                <input
                  type="tel"
                  name="emergencyContact"
                  placeholder="e.g. 071 987 6543"
                  value={form.emergencyContact}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Financial Profile */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4">
              3. Occupation & Financial Capacity
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Occupation / Business
                </label>
                <input
                  type="text"
                  name="occupation"
                  placeholder="e.g. Small Business Owner"
                  value={form.occupation}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Estimated Monthly Income (LKR)
                </label>
                <input
                  type="number"
                  name="monthlyIncome"
                  placeholder="e.g. 75000"
                  value={form.monthlyIncome}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl shadow-md transition cursor-pointer"
            >
              <UserPlus size={16} /> Save Customer Record
            </button>
            <Link
              href="/customers"
              className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

