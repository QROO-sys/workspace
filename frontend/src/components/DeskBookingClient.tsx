"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

type Desk = { id: string; name: string; qrUrl: string; laptopSerial?: string | null };
type Avail = { id: string; startAt: string; endAt: string; status: string };

function pad2(n: number) { return String(n).padStart(2, "0"); }

function toDatetimeLocalValue(d: Date) {
  // yyyy-MM-ddTHH:mm in local time
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export default function DeskBookingClient({ desk }: { desk: Desk }) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [startLocal, setStartLocal] = useState<string>("");
  const [hours, setHours] = useState<number>(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [availability, setAvailability] = useState<Avail[]>([]);

  // default start time = next full hour
  useEffect(() => {
    if (startLocal) return;
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    setStartLocal(toDatetimeLocalValue(d));
  }, [startLocal]);

  const startDate = useMemo(() => {
    if (!startLocal) return null;
    const d = new Date(startLocal);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [startLocal]);

  const endDate = useMemo(() => {
    if (!startDate) return null;
    return new Date(startDate.getTime() + Math.max(1, hours) * 60 * 60 * 1000);
  }, [startDate, hours]);

  // Fetch bookings for the selected day (to show conflicts)
  useEffect(() => {
    let active = true;
    async function load() {
      if (!startDate) return;
      const dayStart = new Date(startDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      try {
        const res = await apiFetch(
          `/public/desks/${desk.id}/availability?from=${encodeURIComponent(dayStart.toISOString())}&to=${encodeURIComponent(dayEnd.toISOString())}`
        );
        if (active) setAvailability(Array.isArray(res) ? res : []);
      } catch {
        if (active) setAvailability([]);
      }
    }
    load();
    return () => { active = false; };
  }, [desk.id, startDate]);

  async function submit() {
    setErr(null);
    setResult(null);
    if (!startDate || !endDate) {
      setErr("Pick a valid start time and duration.");
      return;
    }
    if (endDate <= startDate) {
      setErr("End time must be after start time.");
      return;
    }
    setBusy(true);
    try {
      const created = await apiFetch(`/public/desks/${desk.id}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startAt: startDate.toISOString(),
          endAt: endDate.toISOString(),
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
          notes: notes || undefined,
        }),
      });
      setResult(created);
    } catch (e: any) {
      setErr(e?.message || "Failed to create booking.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <div className="rounded border bg-white p-4">
        <h1 className="text-xl font-bold">Book {desk.name}</h1>
        <p className="mt-1 text-sm text-gray-600">
          Choose a future time slot. You can still scan the desk QR later to check in.
        </p>
        {desk.laptopSerial && (
          <p className="mt-1 text-xs text-gray-600"><b>Laptop:</b> {desk.laptopSerial}</p>
        )}

        <div className="mt-4 grid gap-2">
          <input className="w-full rounded border p-2" placeholder="Your name (optional)" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          <input className="w-full rounded border p-2" placeholder="Phone (optional)" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
          <input className="w-full rounded border p-2" placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      <div className="mt-4 rounded border bg-white p-4">
        <h2 className="text-lg font-semibold">Time slot</h2>
        <div className="mt-3 grid gap-3">
          <label className="text-sm">
            Start time
            <input
              type="datetime-local"
              className="mt-1 w-full rounded border p-2"
              value={startLocal}
              onChange={(e) => setStartLocal(e.target.value)}
            />
          </label>

          <label className="text-sm">
            Duration (hours)
            <input
              type="number"
              min={1}
              max={24}
              className="mt-1 w-full rounded border p-2"
              value={hours}
              onChange={(e) => setHours(parseInt(e.target.value || "1", 10) || 1)}
            />
          </label>

          {startDate && endDate && (
            <div className="rounded bg-gray-50 p-3 text-sm">
              <div className="flex justify-between">
                <span>Ends</span>
                <span>{endDate.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        {availability.length > 0 && (
          <div className="mt-4 rounded bg-gray-50 p-3">
            <div className="text-sm font-semibold">Already booked today</div>
            <ul className="mt-2 space-y-1 text-sm text-gray-700">
              {availability.map((b) => (
                <li key={b.id}>
                  {new Date(b.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – {new Date(b.endAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </li>
              ))}
            </ul>
          </div>
        )}

        {err && <div className="mt-3 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{err}</div>}

        <button
          className="mt-4 w-full rounded bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-60"
          disabled={busy}
          onClick={submit}
          type="button"
        >
          {busy ? "Booking..." : "Confirm booking"}
        </button>

        <div className="mt-3 text-sm">
          <a className="underline" href={`/d/${desk.id}`}>Back to desk</a>
        </div>

        {result && (
          <div className="mt-4 rounded border bg-green-50 p-3 text-sm">
            <div className="font-semibold">Booking confirmed</div>
            <div className="mt-1">Booking ID: {result.id}</div>
            {startDate && endDate && (
              <div className="mt-1">
                {startDate.toLocaleString()} → {endDate.toLocaleString()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
