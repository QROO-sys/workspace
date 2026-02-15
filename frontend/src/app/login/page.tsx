"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") || "/owner/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPass] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await apiFetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      router.replace(from);
    } catch (e: any) {
      setErr(e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-24 p-6 rounded shadow bg-white">
      <h1 className="font-bold text-2xl mb-4">Sign In</h1>
      <form onSubmit={onSubmit}>
        <input className="mb-2 w-full p-2 border rounded" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required />
        <input className="mb-4 w-full p-2 border rounded" type="password" value={password} onChange={e => setPass(e.target.value)} placeholder="Password" required />
        {err && <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{err}</div>}
        <button className="w-full py-2 bg-blue-600 text-white rounded disabled:opacity-60" disabled={loading} type="submit">
          {loading ? "Signing in..." : "Login"}
        </button>
      </form>

      <div className="mt-4 text-sm text-gray-700">
        No account? <a className="underline" href="/register">Register</a>
      </div>
    </div>
  );
}
