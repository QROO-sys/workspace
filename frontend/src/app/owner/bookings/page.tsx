"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

type AnyObj = Record<string, any>;

type DeskRow = {
  id: string;
  name: string;
  laptopSerial: string;
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

export default function OwnerBookingsPage() {
  const [loading, setLoading] = useState(true);
  const [pageErr, setPageErr] = useState<string | null>(null);

  const [desks, setDesks] = useState<DeskRow[]>([]);
  const [bookings, setBookings] = useState<AnyObj[]>([]);
  const [sessions, setSessions] = useState<AnyObj[]>([]);

  // Booking panel
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelDeskId, setPanelDeskId] = useState<string>("");
  const [panelDeskName, setPanelDeskName] = useState<string>("");

  const [dateISO, setDateISO] = useState(() => toISODate(new Date()));
  const [startHour, setStartHour] = useState<number>(9);
  const [hoursCount, setHoursCount] = useState<number>(1);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [createOk, setCreateOk] = useState<string | null>(null);

  const hours = useMemo(() => {
    const arr: number[] = [];
    for (let h = 9; h <= 16; h++) arr.push(h);
    return arr;
  }, []);

  async function loadAll() {
    setPageErr(null);
    setLoading(true);

    try {
      const [dRes, bRes, sRes] = await Promise.all([
        apiFetch("/desks", { method: "GET" }),
        apiFetch("/bookings", { method: "GET" }).catch(() => []),
        apiFetch("/sessions/active", { method: "GET" }).catch(() => ({ sessions: [] })),
      ]);

      const dArr = Array.isArray(dRes) ? dRes : (dRes as any)?.desks;
      const bArr = Array.isArray(bRes) ? bRes : (bRes as any)?.bookings;
      const sArr = Array.isArray((sRes as any)?.sessions) ? (sRes as any).sessions : [];

      const normRaw: DeskRow[] = Array.isArray(dArr)
        ? (dArr as any[]).map((d: any, i: number) => ({
            id: String(d?.id ?? d?._id ?? ""),
            name: String(d?.name ?? `Desk ${i + 1}`),
            laptopSerial: String(d?.laptopSerial ?? d?.serial ?? `LAP-${pad3(i + 1)}`),
          }))
        : [];

      // Always 10 rows, pad placeholders if missing
      const out: DeskRow[] = [];
      for (let i = 0; i < 10; i++) {
        const existing = normRaw[i];
        if (existing && existing.id) {
          out.push({
            id: existing.id,
            name: existing.name || `Desk ${i + 1}`,
            laptopSerial: existing.laptopSerial || `LAP-${pad3(i + 1)}`,
          });
        } else {
          out.push({
            id: `placeholder-desk-${i + 1}`,
            name: `Desk ${i + 1}`,
            laptopSerial: `LAP-${pad3(i + 1)}`,
            isPlaceholder: true,
          });
        }
      }

      const normBookings = Array.isArray(bArr)
        ? (bArr as any[]).map((b: any) => ({
            id: String(b?.id ?? b?._id ?? ""),
            tableId: String(b?.tableId ?? b?.deskId ?? b?.table?.id ?? b?.desk?.id ?? ""),
            startAt: String(b?.startAt ?? b?.startTime ?? b?.start ?? b?.from ?? ""),
            endAt: String(b?.endAt ?? b?.endTime ?? b?.end ?? b?.to ?? ""),
            status: String(b?.status ?? ""),
            customerName: String(b?.customerName ?? b?.customer ?? ""),
            customerPhone: String(b?.customerPhone ?? b?.phone ?? ""),
          }))
        : [];

      setDesks(out);
      setBookings(normBookings);
      setSessions(sArr);

      // Helpful warning if desks are all placeholders
      if (!normRaw.length) {
        setPageErr("No desks returned from /desks. Make sure you're logged in and desks are seeded for your tenant.");
      }
    } catch (e: any) {
      setPageErr(e?.message || "Failed to load bookings page data");
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
    for (const s of sessions as any[]) {
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

  function openPanel(d: DeskRow) {
    // This ensures clicking Book ALWAYS does something visible.
    setCreateErr(null);
    setCreateOk(null);

    if (d.isPlaceholder) {
      setCreateErr("This desk is not configured in the database yet (placeholder).");
      setPanelOpen(true);
      setPanelDeskId(d.id);
      setPanelDeskName(d.name);
      return;
    }

    setPanelDeskId(d.id);
    setPanelDeskName(d.name);
    setDateISO(toISODate(new Date()));
    setStartHour(9);
    setHoursCount(1);
    setCustomerName("");
    setCustomerPhone("");
    setPanelOpen(true);
  }

  function closePanel() {
    setPanelOpen(false);
    setCreateErr(null);
    setCreateOk(null);
  }

  async function createBooking() {
    setCreateErr(null);
    setCreateOk(null);

    if (!panelDeskId) return setCreateErr("No desk selected.");
    const d = desks.find((x) => x.id === panelDeskId);

    if (d?.isPlaceholder) return setCreateErr("Cannot book a placeholder desk. Seed desks in DB first.");
    if (activeDeskIds.has(panelDeskId)) return setCreateErr("Desk is currently in session. End session first.");

    if (!customerName.trim() || !customerPhone.trim()) {
      return setCreateErr("Customer name and phone are required for bookings.");
    }

    if (!Number.isFinite(hoursCount) || hoursCount < 1 || hoursCount > 8) {
      return setCreateErr("Hours must be between 1 and 8.");
    }
    if (!Number.isFinite(startHour) || startHour < 9 || startHour > 16) {
      return setCreateErr("Start hour must be between 09:00 and 16:00.");
    }
    if (startHour + hoursCount > 17) {
      return setCreateErr("Booking must end by 17:00.");
    }

    const startAt = new Date(`${dateISO}T${pad2(startHour)}:00:00`).toISOString();
    const endAt = new Date(`${dateISO}T${pad2(startHour + hoursCount)}:00:00`).toISOString();

    // Overlap check (client-side)
    const conflicts = (upcomingByDesk.get(panelDeskId) || []).some((b) => {
      if (!isFiniteDate(b.startAt) || !isFiniteDate(b.endAt)) return false;
      const a1 = toTime(b.startAt);
      const a2 = toTime(b.endAt);
      const b1 = toTime(startAt);
      const b2 = toTime(endAt);
      return b1 < a2 && b2 > a1;
    });

    if (conflicts) return setCreateErr("This time overlaps an existing booking for that desk.");

    setCreating(true);
    try {
      await apiFetch("/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: panelDeskId,
          startAt,
          endAt,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
        }),
      });

      setCreateOk("Booking created.");
      await loadAll();
    } catch (e: any) {
      setCreateErr(e?.message || "Booking failed");
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <div className="text-sm text-gray-600">Loading bookings…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-bold">Bookings</div>
          <div className="text-sm text-gray-600">Book by desk. Desks in session can’t be booked.</div>
        </div>
        <button className="rounded border px-3 py-2 text-sm hover:bg-gray-50" onClick={loadAll} type="button">
          Refresh
        </button>
      </div>

      {pageErr && (
        <div className="rounded border bg-red-50 p-3 text-sm text-red-800 border-red-200">{pageErr}</div>
      )}

      <div className="overflow-auto rounded border bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 px-3">Desk</th>
              <th className="py-2 px-3">Laptop</th>
              <th className="py-2 px-3">Status</th>
              <th className="py-2 px-3">Next booking</th>
              <th className="py-2 px-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {desks.map((d) => {
              const status = statusFor(d);
              const next = d.isPlaceholder ? null : upcomingByDesk.get(d.id)?.[0];

              const disabled = status === "IN SESSION" || status === "UNCONFIGURED";

              return (
                <tr key={d.id} className="border-b last:border-b-0 align-top">
                  <td className="py-2 px-3 font-medium">{d.name}</td>
                  <td className="py-2 px-3">{d.laptopSerial}</td>
                  <td className="py-2 px-3">
                    <span className="inline-flex rounded px-2 py-1 text-xs border bg-gray-50 border-gray-200">
                      {status}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    {next ? (
                      <div className="text-xs">
                        <div>
                          {next.startAt} → {next.endAt}
                        </div>
                        <div className="text-gray-600">
                          {next.customerName} {next.customerPhone ? `(${next.customerPhone})` : ""}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-600">None</span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    <button
                      className="rounded border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
                      disabled={disabled}
                      onClick={() => openPanel(d)}
                      type="button"
                    >
                      Book
                    </button>
                    {disabled && status === "UNCONFIGURED" && (
                      <div className="text-[11px] text-gray-500 mt-1">Seed desks in DB</div>
                    )}
                    {disabled && status === "IN SESSION" && (
                      <div className="text-[11px] text-gray-500 mt-1">End session first</div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Booking Panel */}
      {panelOpen && (
        <div className="rounded border bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Create booking — {panelDeskName}</div>
            <button className="rounded border px-3 py-2 text-sm hover:bg-gray-50" onClick={closePanel} type="button">
              Close
            </button>
          </div>

          {createErr && (
            <div className="rounded border bg-red-50 p-3 text-sm text-red-800 border-red-200">{createErr}</div>
          )}
          {createOk && (
            <div className="rounded border bg-green-50 p-3 text-sm text-green-800 border-green-200">{createOk}</div>
          )}

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
