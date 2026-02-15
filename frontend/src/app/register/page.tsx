"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [tenantName, setTenantName] = useState("QROO Workspace");
  const [name, setName] = useState("Owner");
  const [email, setEmail] = useState("");
  const [password, setPass] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await apiFetch("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantName,
          name,
          email,
          password,
          role: "OWNER"
        }),
      });
      router.replace("/owner/dashboard");
    } catch (e: any) {
      setErr(e?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-20 p-6 rounded shadow bg-white">
      <h1 className="font-bold text-2xl mb-4">Create Workspace Owner</h1>
      <form onSubmit={onSubmit}>
        <input className="mb-2 w-full p-2 border rounded" value={tenantName} onChange={e => setTenantName(e.target.value)} placeholder="Workspace / Tenant name" required />
        <input className="mb-2 w-full p-2 border rounded" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required />
        <input className="mb-2 w-full p-2 border rounded" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required />
        <input className="mb-4 w-full p-2 border rounded" type="password" value={password} onChange={e => setPass(e.target.value)} placeholder="Password" required />
        {err && <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{err}</div>}
        <button className="w-full py-2 bg-green-600 text-white rounded disabled:opacity-60" disabled={loading} type="submit">
          {loading ? "Creating..." : "Register"}
        </button>
      </form>

      <div className="mt-4 text-sm text-gray-700">
        Already have an account? <a className="underline" href="/login">Login</a>
      </div>
    </div>
  );
}
