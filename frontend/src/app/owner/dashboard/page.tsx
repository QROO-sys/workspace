"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

type AnyObj = Record<string, any>;

function money(n: any) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(v);
}

function monthName(i: number) {
  const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return names[i] || `M${i + 1}`;
}

export default function OwnerDashboardPage() {
  const year = useMemo(() => new Date().getFullYear(), []);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [role, setRole] = useState<string>(""); // OWNER | ADMIN | EMPLOYEE
  const [daily, setDaily] = useState<AnyObj | null>(null);
  const [yearly, setYearly] = useState<AnyObj | null>(null);
  const [alltime, setAlltime] = useState<AnyObj | null>(null);

  async function load() {
    setErr(null);
    setLoading(true);

    try {
      // Determine role (best-effort)
      // /api/auth/me should exist in your project; if not, we fall back to assuming not-owner.
      let me: any = null;
      try {
        me = await fetch("/api/auth/me").then((r) => r.json());
      } catch {
        me = null;
      }
      const r = String(me?.role || me?.user?.role || "").toUpperCase();
      setRole(r);

      // Everyone (staff) gets daily
      const dailyRes = await apiFetch("/analytics/revenue/daily", { method: "GET" });
      setDaily(dailyRes);

      // Owner-only extras
      if (r === "OWNER") {
        const [yearRes, allRes] = await Promise.all([
          apiFetch(`/analytics/revenue/yearly?year=${encodeURIComponent(String(year))}`, { method: "GET" }),
          apiFetch("/analytics/revenue/alltime", { method: "GET" }),
        ]);
        setYearly(yearRes);
        setAlltime(allRes);
      } else {
        setYearly(null);
        setAlltime(null);
      }
    } catch (e: any) {
      setErr(e?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const byMonth = useMemo(() => {
    const arr = Array.isArray(yearly?.byMonth) ? yearly.byMonth : null;
    if (!arr || arr.length !== 12) return null;
    return arr.map((v: any, idx: number) => ({ m: monthName(idx), v: Number(v) || 0 }));
  }, [yearly]);

  if (loading) return <div className="text-sm text-gray-600">Loading dashboard…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-bold">Dashboard</div>
          <div className="text-sm text-gray-600">
            Role: <b>{role || "Unknown"}</b>
          </div>
        </div>

        <button
          className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
          onClick={load}
          type="button"
        >
          Refresh
        </button>
      </div>

      {err && (
        <div className="rounded border bg-red-50 p-3 text-sm text-red-800 border-red-200">
          {err}
        </div>
      )}

      {/* Revenue cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded border bg-white p-4">
          <div className="text-xs text-gray-500">Daily revenue</div>
          <div className="text-2xl font-bold mt-1">{money(daily?.total)} EGP</div>
          <div className="text-xs text-gray-500 mt-1">
            Orders: {Number(daily?.count || 0)}
          </div>
        </div>

        <div className="rounded border bg-white p-4">
          <div className="text-xs text-gray-500">Annual revenue ({year})</div>
          {role === "OWNER" ? (
            <>
              <div className="text-2xl font-bold mt-1">{money(yearly?.total)} EGP</div>
              <div className="text-xs text-gray-500 mt-1">
                Orders: {Number(yearly?.count || 0)}
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-600 mt-2">Owner only</div>
          )}
        </div>

        <div className="rounded border bg-white p-4">
          <div className="text-xs text-gray-500">All-time revenue</div>
          {role === "OWNER" ? (
            <>
              <div className="text-2xl font-bold mt-1">{money(alltime?.total)} EGP</div>
              <div className="text-xs text-gray-500 mt-1">
                Orders: {Number(alltime?.count || 0)}
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-600 mt-2">Owner only</div>
          )}
        </div>
      </div>

      {/* Monthly breakdown (Owner only) */}
      <div className="rounded border bg-white p-4">
        <div className="font-semibold">Monthly breakdown ({year})</div>
        {role !== "OWNER" ? (
          <div className="text-sm text-gray-600 mt-2">Owner only</div>
        ) : !byMonth ? (
          <div className="text-sm text-gray-600 mt-2">No yearly breakdown available.</div>
        ) : (
          <div className="mt-3 overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Month</th>
                  <th className="py-2 pr-4">Revenue (EGP)</th>
                </tr>
              </thead>
              <tbody>
                {byMonth.map((m) => (
                  <tr key={m.m} className="border-b last:border-b-0">
                    <td className="py-2 pr-4">{m.m}</td>
                    <td className="py-2 pr-4">{money(m.v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-xs text-gray-500 mt-2">
              Tip: This is computed from orders. Gateway settlement reports can be added later.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
