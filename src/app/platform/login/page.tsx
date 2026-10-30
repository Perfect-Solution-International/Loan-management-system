"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { platformApi } from "@/lib/billing-api";

export default function PlatformLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await platformApi.login(email, password);
      sessionStorage.setItem("psi_platform_token", result.token);
      router.replace("/platform");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-5">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7">
        <BrandLogo href="/pricing" size="md" theme="light" />
        <h1 className="mt-7 text-2xl font-semibold">Platform administration</h1>
        <p className="mt-2 text-sm text-slate-500">
          Sign in with a separately provisioned platform account.
        </p>
        {error && (
          <p role="alert" className="mt-4 text-sm text-red-800">
            {error}
          </p>
        )}
        <form onSubmit={submit} className="login-form mt-6">
          <label htmlFor="platform-email">Email</label>
          <div className="login-input-wrap">
            <input
              id="platform-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <label htmlFor="platform-password">Password</label>
          <div className="login-input-wrap">
            <input
              id="platform-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button className="login-submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <Link href="/login" className="mt-5 block text-sm text-red-700">
          Organization sign in
        </Link>
      </section>
    </main>
  );
}
