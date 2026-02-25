"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

type Role = "OWNER" | "ADMIN" | "EMPLOYEE" | "RENTER";

function labelRole(r: Role) {
  if (r === "RENTER") return "Customer";
  if (r === "EMPLOYEE") return "Employee";
  if (r === "ADMIN") return "Admin";
  return "Owner";
}

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") || "/owner/dashboard";

  const [role, setRole] = useState<Role>("OWNER");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const res = await apiFetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const token = res?.access_token || res?.accessToken || res?.token;
      if (!token) throw new Error("Login succeeded but no token returned");
      localStorage.setItem("access_token", token);

      // Role-based routing (best effort)
      let me: any = null;
      try {
        me = await fetch("/api/auth/me").then((r) => r.json());
      } catch {
        me = null;
      }
      const serverRole = String(me?.role || me?.user?.role || "").toUpperCase();
      const finalRole = (serverRole || role).toUpperCase();

      if (finalRole === "OWNER" || finalRole === "ADMIN" || finalRole === "EMPLOYEE") {
        router.replace(from.startsWith("/owner") ? from : "/owner/dashboard");
      } else {
        router.replace("/");
      }
    } catch (e: any) {
      setErr(e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-16 p-6 rounded border bg-white space-y-4">
      <div>
        <div className="text-2xl font-bold">Sign in</div>
        <div className="text-sm text-gray-600">Single sign-on for all user types.</div>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block text-sm">
          User type
          <select
            className="mt-1 w-full rounded border p-2"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            <option value="OWNER">{labelRole("OWNER")}</option>
            <option value="ADMIN">{labelRole("ADMIN")}</option>
            <option value="EMPLOYEE">{labelRole("EMPLOYEE")}</option>
            <option value="RENTER">{labelRole("RENTER")}</option>
          </select>
        </label>

        <label className="block text-sm">
          Email
          <input
            className="mt-1 w-full rounded border p-2"
            name="email"
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="block text-sm">
          Password
          <input
            className="mt-1 w-full rounded border p-2"
            name="password"
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {err && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
            {err}
          </div>
        )}

        <button className="w-full rounded bg-gray-900 py-2 text-white disabled:opacity-60" disabled={loading} type="submit">
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
