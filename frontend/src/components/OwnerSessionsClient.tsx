"use client";

import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useState } from "react";

function formatEGP(v: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(v) + " EGP";
}

export default function OwnerSessionsClient({ orders }: { orders: any[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function setStatus(id: string, status: string) {
    setErr(null);
    setBusyId(id);
    try {
      await apiFetch(`/orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "Failed to update status");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mt-6">
      {err && <div className="mb-3 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{err}</div>}

      <div className="space-y-3">
        {orders.map((o) => (
          <div key={o.id} className="rounded border bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="font-semibold">{o.table?.name || "Desk"}</div>
                <div className="text-xs text-gray-600">{o.startAt && o.endAt ? `${new Date(o.startAt).toLocaleString()} → ${new Date(o.endAt).toLocaleString()}` : new Date(o.createdAt).toLocaleString()}</div>
                {(o.customerName || o.customerPhone) && (
                  <div className="mt-1 text-sm text-gray-700">
                    {o.customerName ? <span>{o.customerName}</span> : null}
                    {o.customerPhone ? <span className="ml-2 text-gray-500">{o.customerPhone}</span> : null}
                  </div>
                )}
              </div>

              <div className="text-right">
                <div className="text-lg font-bold">{formatEGP(o.total)}</div>
                <div className="text-xs text-gray-600">Status: {o.status}</div>
              </div>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {(o.orderItems || []).map((li: any, idx: number) => (
                <div key={li.id || idx} className="flex justify-between text-sm text-gray-700">
                  <span>{li.menuItem?.name || "Item"} × {li.quantity}</span>
                  <span>{formatEGP(li.price * li.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className="rounded border px-3 py-1 text-sm disabled:opacity-60"
                disabled={busyId === o.id}
                onClick={() => setStatus(o.id, "CONFIRMED")}
                type="button"
              >
                In progress
              </button>
              <button
                className="rounded bg-green-600 px-3 py-1 text-sm text-white disabled:opacity-60"
                disabled={busyId === o.id}
                onClick={() => setStatus(o.id, "COMPLETED")}
                type="button"
              >
                Completed
              </button>
              <button
                className="rounded bg-gray-700 px-3 py-1 text-sm text-white disabled:opacity-60"
                disabled={busyId === o.id}
                onClick={() => setStatus(o.id, "CANCELLED")}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        ))}
        {orders.length === 0 && <div className="text-sm text-gray-600">No sessions yet.</div>}
      </div>
    </div>
  );
}
