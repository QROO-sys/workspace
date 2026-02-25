"use client";

import { useEffect, useState } from "react";
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
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const res = await apiFetch("/orders", { method: "GET" });
      const arr = Array.isArray(res) ? res : res?.orders || [];
      setOrders(arr.slice(0, 50));
    } catch (e: any) {
      setErr(e?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, []);

  async function patchOrder(orderId: string, body: AnyObj) {
    setBusy(orderId);
    try {
      await apiFetch(`/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await load();
    } catch (e: any) {
      alert(e?.message || "Update failed (backend may not support PATCH yet)");
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <div className="text-sm text-gray-600">Loading orders…</div>;
  if (err) return <div className="text-sm text-red-700">{err}</div>;

  return (
    <div className="space-y-4">
      <div>
        <div className="text-2xl font-bold">Receptionist Orders</div>
        <div className="text-sm text-gray-600">
          Cash orders must be marked paid before acceptance.
        </div>
      </div>

      <div className="overflow-auto rounded border bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 px-3">Created</th>
              <th className="py-2 px-3">Desk</th>
              <th className="py-2 px-3">Items</th>
              <th className="py-2 px-3">Total</th>
              <th className="py-2 px-3">Payment</th>
              <th className="py-2 px-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const itemSummary =
                Array.isArray(o?.orderItems) && o.orderItems.length
                  ? o.orderItems.map((x: any) => `${x?.quantity || 1}× ${x?.menuItem?.name || "Item"}`).join(", ")
                  : "";

              const paymentMethod = String(o?.paymentMethod || "UNKNOWN");
              const paymentStatus = String(o?.paymentStatus || "UNKNOWN");

              return (
                <tr key={o.id} className="border-b last:border-b-0">
                  <td className="py-2 px-3">{String(o?.createdAt || "")}</td>
                  <td className="py-2 px-3">{o?.table?.name || o?.desk?.name || o?.tableId || "-"}</td>
                  <td className="py-2 px-3">{itemSummary}</td>
                  <td className="py-2 px-3">{money(o?.total || o?.amount || o?.sum || "")}</td>
                  <td className="py-2 px-3">
                    <div className="text-xs">
                      <div>Method: {paymentMethod}</div>
                      <div>Status: {paymentStatus}</div>
                    </div>
                  </td>
                  <td className="py-2 px-3 flex gap-2">
                    {paymentMethod === "CASH" && paymentStatus !== "PAID" ? (
                      <button
                        className="rounded border px-2 py-1 hover:bg-gray-50 disabled:opacity-60"
                        disabled={busy === o.id}
                        onClick={() => patchOrder(o.id, { paymentStatus: "PAID" })}
                        type="button"
                      >
                        Mark Paid
                      </button>
                    ) : null}

                    <button
                      className="rounded border px-2 py-1 hover:bg-gray-50 disabled:opacity-60"
                      disabled={busy === o.id}
                      onClick={() => patchOrder(o.id, { status: "ACCEPTED" })}
                      type="button"
                    >
                      Accept
                    </button>

                    <button
                      className="rounded border px-2 py-1 hover:bg-gray-50 disabled:opacity-60"
                      disabled={busy === o.id}
                      onClick={() => patchOrder(o.id, { status: "COMPLETED" })}
                      type="button"
                    >
                      Complete
                    </button>
                  </td>
                </tr>
              );
            })}
            {!orders.length && (
              <tr>
                <td className="py-4 px-3 text-gray-600" colSpan={6}>
                  No orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
