"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Session = {
  bookingId: string;
  deskName: string;
  startAt: string;
  endAt: string;
  status: string;
  customerName: string;
  customerPhone: string;
  freeCoffeeEarned: number;
  coffeeUsed: number;
  freeCoffeeAvailable: number;
};

export default function OwnerSessionsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const res = await apiFetch("/sessions/active", { method: "GET" });
      setSessions(res?.sessions || []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function extend(id: string) {
    setBusyId(id);
    try {
      await apiFetch(`/sessions/${id}/extend`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours: 1 }),
      });
      await load();
    } catch (e: any) {
      alert(e?.message || "Extend failed");
    } finally {
      setBusyId(null);
    }
  }

  async function close(id: string) {
    if (!confirm("Close this session now?")) return;
    setBusyId(id);
    try {
      await apiFetch(`/sessions/${id}/close`, { method: "PATCH" });
      await load();
    } catch (e: any) {
      alert(e?.message || "Close failed");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <div className="text-sm text-gray-600">Loading sessions…</div>;
  if (err) return <div className="text-sm text-red-700">{err}</div>;

  return (
    <div className="space-y-4">
      <div className="text-2xl font-bold">Sessions (Current Occupancy)</div>

      <div className="overflow-auto rounded border bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 px-3">Desk</th>
              <th className="py-2 px-3">Customer</th>
              <th className="py-2 px-3">Start</th>
              <th className="py-2 px-3">End</th>
              <th className="py-2 px-3">Free Coffee</th>
              <th className="py-2 px-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.bookingId} className="border-b last:border-b-0">
                <td className="py-2 px-3">{s.deskName}</td>
                <td className="py-2 px-3">
                  {s.customerName || "-"} {s.customerPhone ? `(${s.customerPhone})` : ""}
                </td>
                <td className="py-2 px-3">{String(s.startAt)}</td>
                <td className="py-2 px-3">{String(s.endAt)}</td>
                <td className="py-2 px-3">
                  earned {s.freeCoffeeEarned} / used {s.coffeeUsed} / available{" "}
                  <b>{s.freeCoffeeAvailable}</b>
                </td>
                <td className="py-2 px-3 flex gap-2">
                  <button
                    className="rounded border px-2 py-1 hover:bg-gray-50 disabled:opacity-60"
                    disabled={busyId === s.bookingId}
                    onClick={() => extend(s.bookingId)}
                  >
                    +1 hour
                  </button>
                  <button
                    className="rounded border px-2 py-1 hover:bg-gray-50 disabled:opacity-60"
                    disabled={busyId === s.bookingId}
                    onClick={() => close(s.bookingId)}
                  >
                    Close
                  </button>
                </td>
              </tr>
            ))}
            {!sessions.length && (
              <tr>
                <td className="py-4 px-3 text-gray-600" colSpan={6}>
                  No active sessions.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <button className="rounded border px-3 py-2 text-sm hover:bg-gray-50" onClick={load}>
        Refresh
      </button>
    </div>
  );
}
