"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type AnyObj = Record<string, any>;

function toArr(x: any): any[] {
  if (Array.isArray(x)) return x;
  if (Array.isArray(x?.items)) return x.items;
  if (Array.isArray(x?.data)) return x.data;
  if (Array.isArray(x?.bookings)) return x.bookings;
  return [];
}

export default function OwnerBookingsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [bookings, setBookings] = useState<AnyObj[]>([]);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const res = await apiFetch("/bookings", { method: "GET" });
      const arr = toArr(res);

      const norm = arr.map((b: any) => ({
        id: String(b?.id ?? b?._id ?? ""),
        desk: String(b?.table?.name ?? b?.desk?.name ?? b?.tableId ?? b?.deskId ?? ""),
        start: String(b?.startAt ?? b?.startTime ?? b?.start ?? b?.from ?? ""),
        end: String(b?.endAt ?? b?.endTime ?? b?.end ?? b?.to ?? ""),
        status: String(b?.status ?? ""),
        customer: String(b?.customerName ?? b?.customer ?? b?.userEmail ?? ""),
        phone: String(b?.customerPhone ?? b?.phone ?? ""),
      }));

      setBookings(norm);
    } catch (e: any) {
      setErr(e?.message || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <div className="text-sm text-gray-600">Loading bookings…</div>;

  if (err) {
    return (
      <div className="rounded border bg-white p-4">
        <div className="font-semibold mb-2">Bookings error</div>
        <div className="text-sm text-red-700 break-words">{err}</div>
        <button className="mt-3 rounded border px-3 py-2 text-sm hover:bg-gray-50" onClick={load} type="button">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold">Bookings</div>
          <div className="text-sm text-gray-600">Total: {bookings.length}</div>
        </div>
        <button className="rounded border px-3 py-2 text-sm hover:bg-gray-50" onClick={load} type="button">
          Refresh
        </button>
      </div>

      <div className="overflow-auto rounded border bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 px-3">Desk</th>
              <th className="py-2 px-3">Customer</th>
              <th className="py-2 px-3">Phone</th>
              <th className="py-2 px-3">Start</th>
              <th className="py-2 px-3">End</th>
              <th className="py-2 px-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-b last:border-b-0">
                <td className="py-2 px-3">{b.desk}</td>
                <td className="py-2 px-3">{b.customer}</td>
                <td className="py-2 px-3">{b.phone}</td>
                <td className="py-2 px-3">{b.start}</td>
                <td className="py-2 px-3">{b.end}</td>
                <td className="py-2 px-3">{b.status}</td>
              </tr>
            ))}
            {!bookings.length && (
              <tr>
                <td className="py-4 px-3 text-gray-600" colSpan={6}>
                  No bookings found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
