"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

type AnyObj = Record<string, any>;

function toArr(x: any): any[] {
  if (Array.isArray(x)) return x;
  if (Array.isArray(x?.items)) return x.items;
  if (Array.isArray(x?.data)) return x.data;
  if (Array.isArray(x?.bookings)) return x.bookings;
  if (Array.isArray(x?.desks)) return x.desks;
  return [];
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function OwnerBookingsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [desksLoading, setDesksLoading] = useState(true);
  const [desksErr, setDesksErr] = useState<string | null>(null);
  const [desks, setDesks] = useState<AnyObj[]>([]);

  const [bookings, setBookings] = useState<AnyObj[]>([]);

  // Create booking form state
  const [deskId, setDeskId] = useState<string>("");
  const [dateISO, setDateISO] = useState(() => toISODate(new Date()));
  const [startHour, setStartHour] = useState<number>(9);
  const [hoursCount, setHoursCount] = useState<number>(1);
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");

  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);

  const hours = useMemo(() => {
    // Booking can start 9..16, and must end by 17:00
    const arr: number[] = [];
    for (let h = 9; h <= 16; h++) arr.push(h);
    return arr;
  }, []);

  async function loadDesks() {
    setDesksErr(null);
    setDesksLoading(true);
    try {
      const res = await apiFetch("/desks", { method: "GET" });
      const arr = Array.isArray(res) ? res : res?.desks;
      if (!Array.isArray(arr)) throw new Error("Unexpected /desks response");
      const norm = arr.map((d: any, i: number) => ({
        id: String(d?.id ?? d?._id ?? ""),
        name: String(d?.name ?? `Desk ${i + 1}`),
        laptopSerial: String(d?.laptopSerial ?? d?.serial ?? ""),
      }));
      setDesks(norm);
      if (!deskId && norm.length) setDeskId(norm[0].id);
    } catch (e: any) {
      setDesksErr(e?.message || "Failed to load desks");
    } finally {
      setDesksLoading(false);
    }
  }

  async function loadBookings() {
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

  async function loadAll() {
    await Promise.all([loadDesks(), loadBookings()]);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createBooking() {
    setCreateErr(null);

    if (!deskId) {
      setCreateErr("Choose a desk.");
      return;
    }
    if (!customerName.trim() || !customerPhone.trim()) {
      setCreateErr("Customer name and phone are required.");
      return;
    }
    if (!Number.isFinite(hoursCount) || hoursCount < 1 || hoursCount > 8) {
      setCreateErr("Hours must be between 1 and 8.");
      return;
    }
    if (!Number.isFinite(startHour) || startHour < 9 || startHour > 16) {
      setCreateErr("Start time must be between 09:00 and 16:00.");
      return;
    }
    if (startHour + hoursCount > 17) {
      setCreateErr("Booking must end by 17:00.");
      return;
    }

    const startAt = new Date(`${dateISO}T${pad(startHour)}:00:00`).toISOString();
    const endAt = new Date(`${dateISO}T${pad(startHour + hoursCount)}:00:00`).toISOString();

    setCreating(true);
    try {
      // Backend controller: @Controller('bookings')
      await apiFetch("/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: deskId,
          startAt,
          endAt,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
        }),
      });

      alert("Booking created.");
      setCustomerName("");
      setCustomerPhone("");
      setHoursCount(1);
      setStartHour(9);

      await loadBookings();
    } catch (e: any) {
      setCreateErr(e?.message || "Failed to create booking");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-bold">Bookings</div>
        <div className="text-sm text-gray-600">
          Create future bookings and view all bookings.
        </div>
      </div>

      {/* Create booking */}
      <div className="rounded border bg-white p-4 space-y-3">
        <div className="font-semibold">Create Booking</div>

        {desksLoading ? (
          <div className="text-sm text-gray-600">Loading desks…</div>
        ) : desksErr ? (
          <div className="text-sm text-red-700">{desksErr}</div>
        ) : (
          <>
            <label className="block text-sm">
              Desk
              <select
                className="mt-1 w-full rounded border p-2"
                value={deskId}
                onChange={(e) => setDeskId(e.target.value)}
              >
                {desks.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}{d.laptopSerial ? ` (Laptop: ${d.laptopSerial})` : ""}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-sm">
                Date
                <input
                  className="mt-1 w-full rounded border p-2"
                  type="date"
                  value={dateISO}
                  onChange={(e) => setDateISO(e.target.value)}
                />
              </label>

              <label className="block text-sm">
                Start Time
                <select
                  className="mt-1 w-full rounded border p-2"
                  value={startHour}
                  onChange={(e) => setStartHour(Number(e.target.value))}
                >
                  {hours.map((h) => (
                    <option key={h} value={h}>
                      {pad(h)}:00
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm">
                Duration (hours)
                <input
                  className="mt-1 w-full rounded border p-2"
                  type="number"
                  min={1}
                  max={8}
                  value={hoursCount}
                  onChange={(e) => setHoursCount(Number(e.target.value))}
                />
                <div className="text-xs text-gray-500 mt-1">Must end by 17:00.</div>
              </label>

              <label className="block text-sm">
                Customer Name
                <input
                  className="mt-1 w-full rounded border p-2"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </label>

              <label className="block text-sm md:col-span-2">
                Customer Phone
                <input
                  className="mt-1 w-full rounded border p-2"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </label>
            </div>

            {createErr && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
                {createErr}
              </div>
            )}

            <button
              className="rounded bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-60"
              disabled={creating}
              onClick={createBooking}
              type="button"
            >
              {creating ? "Creating…" : "Create Booking"}
            </button>
          </>
        )}
      </div>

      {/* Bookings table */}
      <div className="rounded border bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">All Bookings</div>
          <button
            className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
            onClick={loadBookings}
            type="button"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-sm text-gray-600">Loading bookings…</div>
        ) : err ? (
          <div className="text-sm text-red-700">{err}</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Desk</th>
                  <th className="py-2 pr-4">Customer</th>
                  <th className="py-2 pr-4">Phone</th>
                  <th className="py-2 pr-4">Start</th>
                  <th className="py-2 pr-4">End</th>
                  <th className="py-2 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-b last:border-b-0">
                    <td className="py-2 pr-4">{b.desk}</td>
                    <td className="py-2 pr-4">{b.customer}</td>
                    <td className="py-2 pr-4">{b.phone}</td>
                    <td className="py-2 pr-4">{b.start}</td>
                    <td className="py-2 pr-4">{b.end}</td>
                    <td className="py-2 pr-4">{b.status}</td>
                  </tr>
                ))}
                {!bookings.length && (
                  <tr>
                    <td className="py-4 text-gray-600" colSpan={6}>
                      No bookings found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
