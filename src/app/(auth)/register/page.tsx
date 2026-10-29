"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, CheckCircle2 } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { billingApi, type OrganizationRegistration } from "@/lib/billing-api";
import { saveSession } from "@/lib/api-client";

const fields = [
 ["organizationName", "Organization name", "text", "organization"],
 ["adminName", "Administrator name", "text", "name"],
 ["email", "Email address", "email", "email"],
 ["phone", "Contact number", "tel", "tel"],
 ["password", "Password", "password", "new-password"],
 ["confirmPassword", "Confirm password", "password", "new-password"],
] as const;
export default function OrganizationRegisterPage() {
 const router = useRouter();
 const [form, setForm] = useState<OrganizationRegistration>({organizationName: "", adminName: "", email: "", phone: "", password: "", confirmPassword: ""});
 const [busy, setBusy] = useState(false); const [error, setError] = useState("");
 async function submit(e: React.FormEvent) {
  e.preventDefault(); if (busy) return; setError("");
  if (form.password !== form.confirmPassword) {setError("Passwords must match."); return;}
  setBusy(true);
  try {const result = await billingApi.register(form); saveSession(result.token, "staff"); router.replace("/dashboard");}
  catch (err) {setError(err instanceof Error ? err.message : "Registration failed");}
  finally {setBusy(false);}
 }
 return <main className="login-page">
  <section className="login-visual">
   <div className="login-brand mb-4"><BrandLogo href="/pricing" size="lg" theme="dark" /></div>
   <div className="login-visual-content"><span className="login-kicker"><Building2 size={16} /> YOUR ORGANIZATION, ONE WORKSPACE</span>
    <h1>Start lending.<br /><span>Stay in control.</span></h1>
    <p>Create your lending organization and explore PSI One for 7 days. No card required.</p>
    <div className="login-feature-list">{["Your own customers, loans and financial records", "Administrator and staff permissions", "Subscription managed by your organization"].map(text => <div key={text}><span><CheckCircle2 size={18} /></span><section><strong>{text}</strong></section></div>)}</div>
   </div>
  </section>
  <section className="login-form-side"><div className="login-form-wrap py-8">
   <div className="login-mobile-brand mb-6"><BrandLogo href="/pricing" size="md" theme="light" /></div>
   <p className="login-eyebrow">7-DAY FREE TRIAL</p><h2>Register your organization</h2><p className="login-intro">Your trial starts when your account is created.</p>
   {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
   <form onSubmit={submit} className="login-form">
    {fields.map(([key, label, type, autoComplete]) => <div key={key}><label htmlFor={key}>{label}</label><div className="login-input-wrap"><input id={key} name={key} type={type} autoComplete={autoComplete} required minLength={type === "password" ? 12 : key === "phone" ? 7 : 2} maxLength={type === "password" ? 72 : 254} value={form[key]} onChange={e => setForm({...form, [key]: e.target.value})} /></div></div>)}
    <p className="text-xs text-slate-500">Use a password of at least 12 characters. The trial is available once per organization account.</p>
    <button disabled={busy} className="login-submit" type="submit">{busy ? "Creating organization…" : "Start Free Trial"}<ArrowRight size={18} /></button>
   </form>
   <div className="mt-5 flex flex-wrap justify-between gap-3 text-sm"><Link href="/login" className="text-red-700">Already registered? Sign in</Link><Link href="/pricing">View plans</Link></div>
   <p className="mt-5 text-xs text-slate-600">Borrower with an existing lender? <Link href="/customer-register" className="font-semibold text-red-700">Create a customer account</Link></p>
  </div></section>
 </main>;
}
