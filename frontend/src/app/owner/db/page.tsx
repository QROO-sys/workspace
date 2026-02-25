"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export default function OwnerDbToolsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [exportKind, setExportKind] = useState<string>("users");
  const [rows, setRows] = useState<any[] | null>(null);

  async function loadSummary() {
    setErr(null);
    setLoading(true);
    try {
      const res = await apiFetch("/db-tools/summary", { method: "GET" });
      setSummary(res);
    } catch (e: any) {
      setErr(e?.message || "Failed to load DB summary (owner only)");
    } finally {
      setLoading(false);
    }
  }

  async function runExport() {
    setRows(null);
    setErr(null);
    try {
      const res = await apiFetch(`/db-tools/export?kind=${encodeURIComponent(exportKind)}`, { method: "GET" });
      setRows(res?.rows || []);
    } catch (e: any) {
      setErr(e?.message || "Export failed");
    }
  }

  useEffect(() => {
    loadSummary();
  }, []);

  if (loading) return <div className="text-sm text-gray-600">Loading DB tools…</div>;
  if (err) return <div className="text-sm text-red-700">{err}</div>;

  return (
    <div className="space-y-4">
      <div className="text-2xl font-bold">DB Tools (Owner Only)</div>

      <div className="rounded border bg-white p-4">
        <div className="font-semibold mb-2">Summary</div>
        <pre className="text-xs overflow-auto">{JSON.stringify(summary, null, 2)}</pre>
      </div>

      <div className="rounded border bg-white p-4 space-y-2">
        <div className="font-semibold">Export (read-only)</div>
        <div className="flex gap-2 items-center">
          <select className="border rounded px-2 py-1" value={exportKind} onChange={(e) => setExportKind(e.target.value)}>
            <option value="users">users</option>
            <option value="desks">desks</option>
            <option value="menu-items">menu-items</option>
            <option value="bookings">bookings</option>
            <option value="orders">orders</option>
          </select>

          <button className="rounded border px-3 py-2 text-sm hover:bg-gray-50" onClick={runExport}>
            Run Export
          </button>
        </div>

        {rows && (
          <pre className="text-xs overflow-auto border rounded p-2 bg-gray-50">
            {JSON.stringify(rows, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
