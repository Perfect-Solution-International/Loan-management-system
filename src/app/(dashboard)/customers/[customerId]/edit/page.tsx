/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  Upload,
  UserCheck,
  MapPin,
  Phone,
  Camera,
  X,
  FileText,
} from "lucide-react";
import { useData } from "@/providers/data-provider";
import type { Customer } from "@/types";

const SRI_LANKA_DISTRICTS = [
  "Colombo",
  "Gampaha",
  "Kalutara",
  "Kandy",
  "Matale",
  "Nuwara Eliya",
  "Galle",
  "Matara",
  "Hambantota",
  "Jaffna",
  "Kilinochchi",
  "Mannar",
  "Vavuniya",
  "Mullaitivu",
  "Batticaloa",
  "Ampara",
  "Trincomalee",
  "Kurunegala",
  "Puttalam",
  "Anuradhapura",
  "Polonnaruwa",
  "Badulla",
  "Moneragala",
  "Ratnapura",
  "Kegalle",
];

function EditCustomerForm({ customer }: { customer: Customer }) {
  const router = useRouter();
  const { updateCustomer } = useData();

  const [form, setForm] = useState({
    fullName: customer.fullName || customer.name || "",
    nic: customer.nic || "",
    dob: customer.dob || "",
    gender: customer.gender || "Male",
    address: customer.address || "",
    village: customer.village || "",
    town: customer.town || "",
    district: customer.district || "Colombo",
    phone: customer.phone || "",
    alternatePhone: customer.alternatePhone || "",
    email: customer.email || "",
    status: customer.status,
    photoUrl: customer.photoUrl || "",
    nicFrontUrl: customer.nicFrontUrl || "",
    nicBackUrl: customer.nicBackUrl || "",
  });

  const [notificationMsg, setNotificationMsg] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setForm((prev) => ({ ...prev, photoUrl: event.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNicFrontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setForm((prev) => ({ ...prev, nicFrontUrl: event.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNicBackUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setForm((prev) => ({ ...prev, nicBackUrl: event.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim() || !form.nic.trim() || !form.phone.trim()) {
      alert("Full Name, NIC, and Contact Phone are required.");
      return;
    }

    updateCustomer(customer.id, {
      name: form.fullName.trim(),
      fullName: form.fullName.trim(),
      nic: form.nic.trim().toUpperCase(),
      dob: form.dob,
      gender: form.gender,
      address: form.address.trim(),
      village: form.village.trim(),
      town: form.town.trim(),
      district: form.district,
      phone: form.phone.trim(),
      alternatePhone: form.alternatePhone.trim() || undefined,
      email: form.email.trim() || undefined,
      status: form.status,
      photoUrl: form.photoUrl || undefined,
      nicFrontUrl: form.nicFrontUrl || undefined,
      nicBackUrl: form.nicBackUrl || undefined,
    });

    setNotificationMsg("Customer profile updated successfully!");
    setTimeout(() => {
      router.push(`/customers/${customer.id}`);
    }, 1000);
  };

  return (
    <div className="mx-auto workspace-page form-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-red-600 uppercase tracking-wider">
            CUSTOMER PROFILE / EDIT
          </p>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mt-1">
            Edit Customer Profile
          </h1>
          <p className="text-xs text-slate-500">
            Updating records for <span className="font-semibold">{customer.name}</span> ({customer.id})
          </p>
        </div>
        <Link
          href={`/customers/${customer.id}`}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
        >
          <ArrowLeft size={14} /> Back to Profile
        </Link>
      </div>

      {notificationMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm font-semibold shadow-xs" role="status">
          <CheckCircle2 size={18} className="text-emerald-600" />
          <span>{notificationMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
        {/* Photograph & Status */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                <Camera size={18} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Photograph & Customer Status</h2>
                <p className="text-xs text-slate-600">Update photo portrait and account status.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Status:</span>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 font-semibold bg-white text-slate-700"
               aria-label="status">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Photo Avatar Preview */}
            <div className="relative group shrink-0">
              {form.photoUrl ? (
                <div className="relative">
                  <img
                    src={form.photoUrl}
                    alt="Customer Preview"
                    className="w-24 h-24 rounded-2xl object-cover border-2 border-red-500 shadow-md bg-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, photoUrl: "" }))}
                    className="absolute -top-2 -right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-xs cursor-pointer transition"
                    title="Remove Photo"
                   aria-label="Remove Photo">
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400 gap-1.5 shadow-2xs">
                  <Camera size={26} className="text-slate-400" />
                  <span className="text-xs font-semibold text-slate-500">No Photo</span>
                </div>
              )}
            </div>

            <div className="space-y-3 flex-1">
              <div>
                <label className="text-xs font-semibold text-slate-700 block">
                  Customer Photograph
                </label>
                <p className="text-xs text-slate-500 mt-0.5">
                  Clear facial portrait for verification and loan dossier.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold cursor-pointer transition">
                  <Upload size={14} /> Upload Photograph
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
                {form.photoUrl && (
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, photoUrl: "" }))}
                    className="text-xs text-red-600 hover:text-red-700 font-semibold cursor-pointer underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Dedicated NIC Front & Back Images */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="p-2 bg-red-50 text-red-600 rounded-xl">
              <FileText size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                National Identity Card (NIC) Images
              </h2>
              <p className="text-xs text-slate-500">
                Dedicated image uploads for borrower NIC front and back surfaces.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* NIC Front */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  NIC Front Side
                </label>
                {form.nicFrontUrl && (
                  <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">
                    Uploaded
                  </span>
                )}
              </div>

              {form.nicFrontUrl ? (
                <div className="space-y-2">
                  <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-white">
                    <img
                      src={form.nicFrontUrl}
                      alt="NIC Front"
                      className="w-full h-36 object-contain bg-slate-900/5 p-2"
                    />
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, nicFrontUrl: "" }))}
                      className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition shadow-xs cursor-pointer"
                      title="Remove NIC Front"
                     aria-label="Remove NIC Front">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <label className="border-2 border-dashed border-slate-300 hover:border-red-400 bg-white hover:bg-red-50/20 rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition">
                  <Upload size={22} className="text-red-500" />
                  <span className="text-xs font-bold text-slate-700">Upload NIC Front</span>
                  <span className="text-[11px] text-slate-400">PNG, JPG, WebP</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleNicFrontUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* NIC Back */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  NIC Back Side
                </label>
                {form.nicBackUrl && (
                  <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">
                    Uploaded
                  </span>
                )}
              </div>

              {form.nicBackUrl ? (
                <div className="space-y-2">
                  <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-white">
                    <img
                      src={form.nicBackUrl}
                      alt="NIC Back"
                      className="w-full h-36 object-contain bg-slate-900/5 p-2"
                    />
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, nicBackUrl: "" }))}
                      className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition shadow-xs cursor-pointer"
                      title="Remove NIC Back"
                     aria-label="Remove NIC Back">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <label className="border-2 border-dashed border-slate-300 hover:border-red-400 bg-white hover:bg-red-50/20 rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition">
                  <Upload size={22} className="text-red-500" />
                  <span className="text-xs font-bold text-slate-700">Upload NIC Back</span>
                  <span className="text-[11px] text-slate-400">PNG, JPG, WebP</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleNicBackUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Identity & Contact Details */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <UserCheck size={18} />
            </div>
            <h2 className="text-sm font-bold text-slate-900">Personal Identity & NIC</h2>
          </div>

          <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700" htmlFor="field-app-dashboard-customers-customerId-edit-page-1">Residential Address</label>
              <input
                type="text"
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Full residential address"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs font-semibold" id="field-app-dashboard-customers-customerId-edit-page-1"
              />
            </div>
          </div>

        {/* Residential Location */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="p-2 bg-red-50 text-red-600 rounded-xl">
              <MapPin size={18} />
            </div>
            <h2 className="text-sm font-bold text-slate-900">Residential Address</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-700" htmlFor="ui-field-4">Residential Address</label>
              <input
                type="text"
                name="address"
                value={form.address}
                onChange={handleChange}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700" htmlFor="ui-field-5">Village / Grama Niladhari</label>
              <input
                type="text"
                name="village"
                value={form.village}
                onChange={handleChange}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700" htmlFor="ui-field-6">Town / City</label>
              <input
                type="text"
                name="town"
                value={form.town}
                onChange={handleChange}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700" htmlFor="ui-field-7">District</label>
              <select
                name="district"
                value={form.district}
                onChange={handleChange}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs font-semibold bg-white"
              >
                {SRI_LANKA_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Contact & Communication Details */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="p-2 bg-red-50 text-red-600 rounded-xl">
              <Phone size={18} />
            </div>
            <h2 className="text-sm font-semibold text-slate-900">Contact & Communication Details</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700" htmlFor="ui-field-8">Primary Contact Phone</label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700" htmlFor="ui-field-9">Alternative Phone</label>
              <input
                type="tel"
                name="alternatePhone"
                value={form.alternatePhone}
                onChange={handleChange}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700" htmlFor="ui-field-10">Email Address</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-2xs font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Link
            href={`/customers/${customer.id}`}
            className="px-5 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
          >
            <Save size={16} /> Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}

function EditCustomerContent() {
  const params = useParams<{ customerId?: string; id?: string }>();
  const customerId = params?.customerId || params?.id;
  const { customers } = useData();

  const customer = customers.find((c) => c.id === customerId);

  if (!customer) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-4">
        <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-2xl border border-slate-200 text-center space-y-4">
          <h2 className="text-xl font-semibold text-slate-800">Customer Not Found</h2>
          <p className="text-xs text-slate-500">
            Cannot find customer with ID &quot;{customerId}&quot;.
          </p>
          <Link
            href="/customers"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold"
          >
            <ArrowLeft size={14} /> Back to Customers
          </Link>
        </div>
      </div>
    );
  }

  return <EditCustomerForm key={customer.id} customer={customer} />;
}

export default function EditCustomerPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto text-xs text-slate-600 workspace-page form-page">
          Loading customer editor...
        </div>
      }
    >
      <EditCustomerContent />
    </Suspense>
  );
}
