"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type Desk = { id: string; name: string; laptopSerial?: string | null };
type MenuItem = { id: string; sku: string; name: string; price: number };
type Order = any;

const SKU_EXTRA_HOUR = "001";
const SKU_COFFEE = "002";
const SKU_TEA = "003";
const SKU_PASTRY = "004";

function formatEGP(v: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(v) + " EGP";
}

function toDatetimeLocalValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function prettyTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function OwnerBookingsClient({
  desks,
  menuItems,
  upcoming,
}: {
  desks: Desk[];
  menuItems: MenuItem[];
  upcoming: Order[];
}) {
  const router = useRouter();
  const [deskId, setDeskId] = useState(desks[0]?.id || "");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [startLocal, setStartLocal] = useState(() => toDatetimeLocalValue(new Date(Date.now() + 60 * 60 * 1000)));
  const [hours, setHours] = useState(1);
  const [coffeeQty, setCoffeeQty] = useState(0);
  const [teaQty, setTeaQty] = useState(0);
  const [pastryQty, setPastryQty] = useState(0);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const ids = useMemo(() => {
    const bySku = new Map(menuItems.map((m) => [m.sku, m.id]));
    return {
      extraHourId: bySku.get(SKU_EXTRA_HOUR),
      coffeeId: bySku.get(SKU_COFFEE),
      teaId: bySku.get(SKU_TEA),
      pastryId: bySku.get(SKU_PASTRY),
    };
  }, [menuItems]);

  async function createBooking() {
    setErr(null);

    if (!deskId) return setErr("Pick a desk.");
    if (!ids.extraHourId) return setErr("Missing menu item SKU 001 (Extra hour).");
    const start = new Date(startLocal);
    if (Number.isNaN(start.getTime())) return setErr("Pick a valid start time.");
    if (!Number.isFinite(hours) || hours <= 0) return setErr("Hours must be at least 1.");

    const items: Array<{ menuItemId: string; quantity: number }> = [
      { menuItemId: ids.extraHourId, quantity: Math.floor(hours) },
    ];

    if (coffeeQty > 0 && ids.coffeeId) items.push({ menuItemId: ids.coffeeId, quantity: Math.floor(coffeeQty) });
    if (teaQty > 0 && ids.teaId) items.push({ menuItemId: ids.teaId, quantity: Math.floor(teaQty) });
    if (pastryQty > 0 && ids.pastryId) items.push({ menuItemId: ids.pastryId, quantity: Math.floor(pastryQty) });

    setBusy(true);
    try {
      await apiFetch("/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: deskId,
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
          startAt: start.toISOString(),
          items,
        }),
      });
      setCustomerName("");
      setCustomerPhone("");
      setHours(1);
      setCoffeeQty(0);
      setTeaQty(0);
      setPastryQty(0);
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "Failed to create booking.");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, status: string) {
    setErr(null);
    setBusy(true);
    try {
      await apiFetch(`/orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "Failed to update status.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <div className="rounded border bg-white p-4">
        <h2 className="text-lg font-semibold">Create a booking</h2>
        <p className="mt-1 text-sm text-gray-600">
          This reserves a desk for a future time slot. If the desk is already booked, you’ll get an error.
        </p>

        {err && <div className="mt-3 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{err}</div>}

        <div className="mt-4 grid gap-2">
          <label className="text-xs text-gray-600">Desk</label>
          <select className="rounded border p-2" value={deskId} onChange={(e) => setDeskId(e.target.value)}>
            {desks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}{d.laptopSerial ? ` (Laptop ${d.laptopSerial})` : ""}
              </option>
            ))}
          </select>

          <label className="mt-2 text-xs text-gray-600">Start time</label>
          <input type="datetime-local" className="rounded border p-2" value={startLocal} onChange={(e) => setStartLocal(e.target.value)} />

          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <div>
              <label className="text-xs text-gray-600">Hours (SKU 001)</label>
              <input
                type="number"
                min={1}
                className="w-full rounded border p-2"
                value={hours}
                onChange={(e) => setHours(parseInt(e.target.value || "1", 10))}
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Coffee qty (SKU 002)</label>
              <input
                type="number"
                min={0}
                className="w-full rounded border p-2"
                value={coffeeQty}
                onChange={(e) => setCoffeeQty(parseInt(e.target.value || "0", 10))}
              />
              <div className="mt-1 text-[11px] text-gray-500">Free coffee will be applied automatically (1 per paid hour).</div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="text-xs text-gray-600">Tea qty (SKU 003)</label>
              <input
                type="number"
                min={0}
                className="w-full rounded border p-2"
                value={teaQty}
                onChange={(e) => setTeaQty(parseInt(e.target.value || "0", 10))}
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Pastry qty (SKU 004)</label>
              <input
                type="number"
                min={0}
                className="w-full rounded border p-2"
                value={pastryQty}
                onChange={(e) => setPastryQty(parseInt(e.target.value || "0", 10))}
              />
            </div>
          </div>

          <label className="mt-2 text-xs text-gray-600">Customer name (optional)</label>
          <input className="rounded border p-2" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />

          <label className="text-xs text-gray-600">Phone (optional)</label>
          <input className="rounded border p-2" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
        </div>

        <button
          className="mt-4 w-full rounded bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-60"
          disabled={busy}
          onClick={createBooking}
          type="button"
        >
          {busy ? "Saving..." : "Create booking"}
        </button>
      </div>

      <div className="rounded border bg-white p-4">
        <h2 className="text-lg font-semibold">Upcoming bookings</h2>
        <p className="mt-1 text-sm text-gray-600">Future start times (not cancelled / completed).</p>

        <div className="mt-4 space-y-3">
          {(upcoming || []).map((o: any) => (
            <div key={o.id} className="rounded border bg-white p-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold">{o.table?.name || "Desk"}</div>
                  <div className="text-xs text-gray-600">
                    {o.startAt && o.endAt ? (
                      <span>{prettyTime(o.startAt)} → {prettyTime(o.endAt)}</span>
                    ) : (
                      <span>{new Date(o.createdAt).toLocaleString()}</span>
                    )}
                  </div>
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

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="rounded border px-3 py-1 text-sm disabled:opacity-60"
                  disabled={busy}
                  onClick={() => setStatus(o.id, "CONFIRMED")}
                  type="button"
                >
                  Confirm
                </button>
                <button
                  className="rounded bg-green-600 px-3 py-1 text-sm text-white disabled:opacity-60"
                  disabled={busy}
                  onClick={() => setStatus(o.id, "COMPLETED")}
                  type="button"
                >
                  Completed
                </button>
                <button
                  className="rounded bg-gray-700 px-3 py-1 text-sm text-white disabled:opacity-60"
                  disabled={busy}
                  onClick={() => setStatus(o.id, "CANCELLED")}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </div>
          ))}
          {(!upcoming || upcoming.length === 0) && <div className="text-sm text-gray-600">No upcoming bookings.</div>}
        </div>
      </div>
    </div>
  );
}
