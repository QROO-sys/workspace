"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

// Optional QR rendering if react-qr-code exists in your project.
// Otherwise, we still show the link.
let QRCode: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  QRCode = require("react-qr-code").default;
} catch {
  QRCode = null;
}

type AnyObj = Record<string, any>;

type DeskRow = {
  id: string;
  name: string;
  laptopSerial: string;
  qrUrl: string;
  isPlaceholder?: boolean;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function pad3(n: number) {
  return String(n).padStart(3, "0");
}
function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function isFiniteDate(x: any) {
  const t = new Date(x).getTime();
  return Number.isFinite(t);
}
function toTime(x: any) {
  const t = new Date(x).getTime();
  return Number.isFinite(t) ? t : 0;
}

export default function OwnerDesksPage() {
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [desks, setDesks] = useState<DeskRow[]>([]);
  const [bookings, setBookings] = useState<AnyObj[]>([]);
  const [sessions, setSessions] = useState<AnyObj[]>([]);

  // Booking panel state
  const [bookingDeskId, setBookingDeskId] = useState<string | null>(null);
  const [dateISO, setDateISO] = useState(() => toISODate(new Date()));
  const [startHour, setStartHour] = useState<number>(9);
  const [hoursCount, setHoursCount] = useState<number>(1);
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);

  const hours = useMemo(() => {
    const arr: number[] = [];
    for (let h = 9; h <= 16; h++) arr.push(h);
    return arr;
  }, []);

  async function loadAll() {
    setErr(null);
    setLoading(true);

    try {
      const [dRes, bRes, sRes] = await Promise.all([
        apiFetch("/desks", { method: "GET" }),
        apiFetch("/bookings", { method: "GET" }).catch(() => []),
        apiFetch("/sessions/active", { method: "GET" }).catch(() => ({ sessions: [] })),
      ]);

      const dArr = Array.isArray(dRes) ? dRes : dRes?.desks;
      const bArr = Array.isArray(bRes) ? bRes : bRes?.bookings;

      if (!Array.isArray(dArr)) throw new Error("Unexpected /desks response");

      const normalized = dArr.map((d: any, i: number) => {
        const id = String(d?.id ?? d?._id ?? `desk-${i + 1}`);
        const name = String(d?.name ?? `Desk ${i + 1}`);

        const laptopSerialRaw = String(d?.laptopSerial ?? d?.serial ?? "");
        const laptopSerial =
          laptopSerialRaw && laptopSerialRaw !== "undefined"
            ? laptopSerialRaw
            : `LAP-${pad3(i + 1)}`;

        const qrUrlRaw = String(d?.qrUrl ?? "");
        const qrUrl =
          qrUrlRaw && qrUrlRaw !== "undefined"
            ? qrUrlRaw
            : `${origin}/d/${id}`;

        return { id, name, laptopSerial, qrUrl } as DeskRow;
      });

      // Always show exactly 10 desk rows (pad placeholders if DB has fewer)
      const out: DeskRow[] = [];
      for (let i = 0; i < 10; i++) {
        const existing = normalized[i];
        if (existing && existing.id) {
          out.push({
            id: existing.id,
            name: existing.name || `Desk ${i + 1}`,
            laptopSerial: existing.laptopSerial || `LAP-${pad3(i + 1)}`,
            qrUrl: existing.qrUrl || `${origin}/d/${existing.id}`,
          });
        } else {
          const id = `placeholder-desk-${i + 1}`;
          out.push({
            id,
            name: `Desk ${i + 1}`,
            laptopSerial: `LAP-${pad3(i + 1)}`,
            qrUrl: `${origin}/d/${id}`,
            isPlaceholder: true,
          });
        }
      }

      const normBookings = Array.isArray(bArr)
        ? bArr.map((b: any) => ({
            id: String(b?.id ?? b?._id ?? ""),
            tableId: String(b?.tableId ?? b?.deskId ?? b?.table?.id ?? b?.desk?.id ?? ""),
            startAt: String(b?.startAt ?? b?.startTime ?? b?.start ?? b?.from ?? ""),
            endAt: String(b?.endAt ?? b?.endTime ?? b?.end ?? b?.to ?? ""),
            status: String(b?.status ?? ""),
            customerName: String(b?.customerName ?? b?.customer ?? b?.userEmail ?? ""),
            customerPhone: String(b?.customerPhone ?? b?.phone ?? ""),
          }))
        : [];

      const normSessions = Array.isArray(sRes?.sessions) ? sRes.sessions : [];

      setDesks(out);
      setBookings(normBookings);
      setSessions(normSessions);
    } catch (e: any) {
      setErr(e?.message || "Failed to load desks");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeDeskIds = useMemo(() => {
    const set = new Set<string>();
    for (const s of sessions) {
      const id = String(s?.deskId || s?.tableId || "");
      if (id) set.add(id);
    }
    return set;
  }, [sessions]);

  const upcomingByDesk = useMemo(() => {
    const now = Date.now();
    const map = new Map<string, AnyObj[]>();

    for (const b of bookings) {
      if (!b.tableId) continue;
      if (!isFiniteDate(b.startAt) || !isFiniteDate(b.endAt)) continue;
      if (toTime(b.endAt) < now) continue;

      const list = map.get(b.tableId) || [];
      list.push(b);
      map.set(b.tableId, list);
    }

    for (const [k, list] of map.entries()) {
      list.sort((a, b) => toTime(a.startAt) - toTime(b.startAt));
      map.set(k, list);
    }
    return map;
  }, [bookings]);

  function statusFor(d: DeskRow) {
    if (d.isPlaceholder) return "UNCONFIGURED";
    if (activeDeskIds.has(d.id)) return "IN SESSION";
    const next = upcomingByDesk.get(d.id)?.[0];
    if (next) return "BOOKED";
    return "OPEN";
  }

  function openBooking(deskId: string) {
    setCreateErr(null);
    setBookingDeskId(deskId);
    setDateISO(toISODate(new Date()));
    setStartHour(9);
    setHoursCount(1);
    setCustomerName("");
    setCustomerPhone("");
  }

  function closeBooking() {
    setCreateErr(null);
    setBookingDeskId(null);
  }

  async function createBooking() {
    setCreateErr(null);

    if (!bookingDeskId) return;

    const deskRow = desks.find((d) => d.id === bookingDeskId);
    if (deskRow?.isPlaceholder) {
      setCreateErr("This desk is not configured in the database yet.");
      return;
    }

    if (activeDeskIds.has(bookingDeskId)) {
      setCreateErr("This desk is currently in session. End the session before booking.");
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
      setCreateErr("Start hour must be between 09:00 and 16:00.");
      return;
    }

    if (startHour + hoursCount > 17) {
      setCreateErr("Booking must end by 17:00.");
      return;
    }

    const startAt = new Date(`${dateISO}T${pad2(startHour)}:00:00`).toISOString();
    const endAt = new Date(`${dateISO}T${pad2(startHour + hoursCount)}:00:00`).toISOString();

    // Overlap check against known bookings
    const conflicts = (upcomingByDesk.get(bookingDeskId) || []).some((b) => {
      if (!isFiniteDate(b.startAt) || !isFiniteDate(b.endAt)) return false;
      const a1 = toTime(b.startAt);
      const a2 = toTime(b.endAt);
      const b1 = toTime(startAt);
      const b2 = toTime(endAt);
      return b1 < a2 && b2 > a1;
    });

    if (conflicts) {
      setCreateErr("This time overlaps an existing booking for that desk.");
      return;
    }

    setCreating(true);
    try {
      await apiFetch("/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: bookingDeskId,
          startAt,
          endAt,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
        }),
      });

      alert("Booking created.");
      closeBooking();
      await loadAll();
    } catch (e: any) {
      setCreateErr(e?.message || "Booking failed");
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-sm text-gray-600">
        Loading desks…
      </div>
    );
  }

  if (err) {
    return (
      <div className="rounded border bg-white p-4">
        <div className="font-semibold mb-2">Desks error</div>
        <div className="text-sm text-red-700 break-words">{err}</div>
        <button className="mt-3 rounded border px-3 py-2 text-sm hover:bg-gray-50" onClick={loadAll} type="button">
          Retry
        </button>
      </div>
    );
  }

  const canRenderQr = !!QRCode;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-2xl font-bold">Desks</div>
          <div className="text-sm text-gray-600">
            10 desks with serial + QR for guest session & ordering. Book directly from this page.
          </div>
        </div>
        <button className="rounded border px-3 py-2 text-sm hover:bg-gray-50" onClick={loadAll} type="button">
          Refresh
        </button>
      </div>

      <div className="overflow-auto rounded border bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 px-3">Desk</th>
              <th className="py-2 px-3">Laptop Serial</th>
              <th className="py-2 px-3">Status</th>
              <th className="py-2 px-3">Guest Link</th>
              <th className="py-2 px-3">QR</th>
              <th className="py-2 px-3">Book</th>
            </tr>
          </thead>
          <tbody>
            {desks.map((d) => {
              const status = statusFor(d);
              return (
                <tr key={d.id} className="border-b last:border-b-0 align-top">
                  <td className="py-3 px-3 font-medium">{d.name}</td>
                  <td className="py-3 px-3">{d.laptopSerial}</td>
                  <td className="py-3 px-3">
                    <span
                      className={
                        "inline-flex rounded px-2 py-1 text-xs border " +
                        (status === "OPEN"
                          ? "bg-green-50 text-green-800 border-green-200"
                          : status === "IN SESSION"
                          ? "bg-red-50 text-red-800 border-red-200"
                          : status === "BOOKED"
                          ? "bg-yellow-50 text-yellow-800 border-yellow-200"
                          : "bg-gray-50 text-gray-700 border-gray-200")
                      }
                    >
                      {status}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <a className="underline" href={d.qrUrl} target="_blank" rel="noreferrer">
                      {d.qrUrl}
                    </a>
                  </td>
                  <td className="py-3 px-3">
                    {canRenderQr ? (
                      <div className="rounded bg-gray-50 p-2 inline-block">
                        <QRCode value={d.qrUrl} size={110} />
                      </div>
                    ) : (
                      <div className="text-xs text-gray-600">QR lib missing — use link.</div>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <button
                      className="rounded border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
                      disabled={status === "IN SESSION" || status === "UNCONFIGURED"}
                      onClick={() => openBooking(d.id)}
                      type="button"
                    >
                      Book
                    </button>
                  </td>
                </tr>
              );
            })}
            {!desks.length && (
              <tr>
                <td className="py-4 px-3 text-gray-600" colSpan={6}>
                  No desks found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {bookingDeskId && (
        <div className="rounded border bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-semibold">
              Create Booking — {desks.find((d) => d.id === bookingDeskId)?.name || bookingDeskId}
            </div>
            <button className="rounded border px-3 py-2 text-sm hover:bg-gray-50" onClick={closeBooking} type="button">
              Close
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-sm">
              Date
              <input className="mt-1 w-full rounded border p-2" type="date" value={dateISO} onChange={(e) => setDateISO(e.target.value)} />
            </label>

            <label className="block text-sm">
              Start Time
              <select className="mt-1 w-full rounded border p-2" value={startHour} onChange={(e) => setStartHour(Number(e.target.value))}>
                {hours.map((h) => (
                  <option key={h} value={h}>
                    {pad2(h)}:00
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              Duration (hours)
              <input className="mt-1 w-full rounded border p-2" type="number" min={1} max={8} value={hoursCount} onChange={(e) => setHoursCount(Number(e.target.value))} />
              <div className="text-xs text-gray-500 mt-1">Must end by 17:00.</div>
            </label>

            <label className="block text-sm">
              Customer Name
              <input className="mt-1 w-full rounded border p-2" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </label>

            <label className="block text-sm md:col-span-2">
              Customer Phone
              <input className="mt-1 w-full rounded border p-2" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            </label>
          </div>

          {createErr && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{createErr}</div>
          )}

          <button
            className="rounded bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-60"
            disabled={creating}
            onClick={createBooking}
            type="button"
          >
            {creating ? "Creating…" : "Create Booking"}
          </button>
        </div>
      )}
    </div>
  );
}
