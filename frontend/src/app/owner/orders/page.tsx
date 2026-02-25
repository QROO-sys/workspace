"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

type AnyObj = Record<string, any>;

function money(n: any) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(v);
}

export default function OwnerOrdersQueuePage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [orders, setOrders] = useState<AnyObj[]>([]);
  const [sessions, setSessions] = useState<AnyObj[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const [oRes, sRes] = await Promise.all([
        apiFetch("/orders", { method: "GET" }),
        apiFetch("/sessions/active", { method: "GET" }).catch(() => ({ sessions: [] })),
      ]);

      const oArr = Array.isArray(oRes) ? oRes : oRes?.orders || [];
      setOrders(oArr.slice(0, 50));

      setSessions(Array.isArray(sRes?.sessions) ? sRes.sessions : []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load orders queue");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 8000); // refresh every 8 seconds
    return () => clearInterval(t);
  }, []);

  const activeByDesk = useMemo(() => {
    const m = new Map<string, AnyObj>();
    for (const s of sessions) {
      m.set(String(s?.deskId || ""), s);
    }
    return m;
  }, [sessions]);

  async function setStatus(orderId: string, status: string) {
    setBusy(orderId);
    try {
      // If you have an order status endpoint, this will work.
      // If not, it will error and we’ll just alert.
      await apiFetch(`/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (e: any) {
      alert(e?.message || "Status update not supported yet");
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <div className="text-sm text-gray-600">Loading orders queue…</div>;
  if (err) return <div className="text-sm text-red-700">{err}</div>;

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-bold">Receptionist Queue</div>
        <div className="text-sm text-gray-600">
          Incoming orders + current desk occupancies.
        </div>
      </div>

      <div className="rounded border bg-white p-4">
        <div className="font-semibold mb-3">Active Sessions (Occupancy)</div>
        {sessions.length ? (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Desk</th>
                  <th className="py-2 pr-4">Customer</th>
                  <th className="py-2 pr-4">Start</th>
                  <th className="py-2 pr-4">Free Coffee</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.bookingId} className="border-b last:border-b-0">
                    <td className="py-2 pr-4">{s.deskName}</td>
                    <td className="py-2 pr-4">{s.customerName || "-"} {s.customerPhone ? `(${s.customerPhone})` : ""}</td>
                    <td className="py-2 pr-4">{String(s.startAt)}</td>
                    <td className="py-2 pr-4">
                      available <b>{s.freeCoffeeAvailable}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-sm text-gray-600">No active sessions.</div>
        )}
      </div>

      <div className="rounded border bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">Incoming Orders</div>
          <button className="rounded border px-3 py-2 text-sm hover:bg-gray-50" onClick={load} type="button">
            Refresh
          </button>
        </div>

        {orders.length ? (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Created</th>
                  <th className="py-2 pr-4">Desk</th>
                  <th className="py-2 pr-4">Items</th>
                  <th className="py-2 pr-4">Total</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const deskId = String(o?.tableId || o?.deskId || "");
                  const sess = activeByDesk.get(deskId);

                  const itemSummary =
                    Array.isArray(o?.orderItems) && o.orderItems.length
                      ? o.orderItems
                          .map((x: any) => `${x?.quantity || 1}× ${x?.menuItem?.name || "Item"}`)
                          .join(", ")
                      : "";

                  return (
                    <tr key={o.id} className="border-b last:border-b-0">
                      <td className="py-2 pr-4">{String(o?.createdAt || "")}</td>
                      <td className="py-2 pr-4">
                        {o?.table?.name || o?.desk?.name || deskId || "-"}
                        {sess?.customerName ? (
                          <div className="text-xs text-gray-500">
                            Occupied by {sess.customerName}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-2 pr-4">{itemSummary}</td>
                      <td className="py-2 pr-4">{money(o?.total || o?.amount || o?.sum || "")}</td>
                      <td className="py-2 pr-4 flex gap-2">
                        <button
                          className="rounded border px-2 py-1 hover:bg-gray-50 disabled:opacity-60"
                          disabled={busy === o.id}
                          onClick={() => setStatus(o.id, "ACCEPTED")}
                          type="button"
                        >
                          Accept
                        </button>
                        <button
                          className="rounded border px-2 py-1 hover:bg-gray-50 disabled:opacity-60"
                          disabled={busy === o.id}
                          onClick={() => setStatus(o.id, "COMPLETED")}
                          type="button"
                        >
                          Complete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-sm text-gray-600">No orders yet.</div>
        )}
      </div>
    </div>
  );
}
