"use client";

import { useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

type MenuItem = { id: string; sku: string; name: string; description?: string | null; price: number };
type Desk = { id: string; name: string; qrUrl: string; laptopSerial?: string | null };
type UpcomingBooking = { id: string; startAt: string; endAt: string; status: string };

const SKU_EXTRA_HOUR = "001";
const SKU_COFFEE = "002";

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

export default function DeskCheckinClient({
  desk,
  menuItems,
  upcoming = [],
}: {
  desk: Desk;
  menuItems: MenuItem[];
  upcoming?: UpcomingBooking[];
}) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [startMode, setStartMode] = useState<"NOW" | "LATER">("NOW");
  const [startLocal, setStartLocal] = useState(() => toDatetimeLocalValue(new Date(Date.now() + 15 * 60 * 1000)));

  const [qty, setQty] = useState<Record<string, number>>(() => {
    // Default: 1 hour
    const initial: Record<string, number> = {};
    for (const mi of menuItems) {
      if (mi.sku === SKU_EXTRA_HOUR) initial[mi.id] = 1;
      else initial[mi.id] = 0;
    }
    return initial;
  });

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  const hoursQty = useMemo(() => {
    const extra = menuItems.find((m) => m.sku === SKU_EXTRA_HOUR);
    return extra ? qty[extra.id] || 0 : 0;
  }, [qty, menuItems]);

  const preview = useMemo(() => {
    // Preview rule: first N coffees are free where N = hoursQty
    const coffee = menuItems.find((m) => m.sku === SKU_COFFEE);
    const coffeeQty = coffee ? qty[coffee.id] || 0 : 0;
    const freeCoffee = Math.min(coffeeQty, Math.max(0, hoursQty));
    const paidCoffee = Math.max(0, coffeeQty - freeCoffee);

    let total = 0;
    for (const mi of menuItems) {
      const q = qty[mi.id] || 0;
      if (!q) continue;
      if (coffee && mi.id === coffee.id) {
        total += paidCoffee * mi.price;
        continue;
      }
      total += q * mi.price;
    }
    return { freeCoffee, paidCoffee, total };
  }, [qty, menuItems, hoursQty]);

  function inc(id: string) {
    setQty((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  }
  function dec(id: string) {
    setQty((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) - 1) }));
  }

  async function submit() {
    setErr(null);
    setResult(null);

    if (hoursQty <= 0) {
      setErr("Add at least 1 hour (Extra hour) to continue.");
      return;
    }

    const items = Object.entries(qty)
      .map(([menuItemId, quantity]) => ({ menuItemId, quantity }))
      .filter((i) => i.quantity > 0);

    let startAt: string | undefined;
    if (startMode === "LATER") {
      const d = new Date(startLocal);
      if (Number.isNaN(d.getTime())) {
        setErr("Please choose a valid future start time.");
        return;
      }
      startAt = d.toISOString();
    }

    setSubmitting(true);
    try {
      const order = await apiFetch("/orders/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: desk.id,
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
          startAt,
          items,
        }),
      });
      setResult(order);
    } catch (e: any) {
      setErr(e?.message || "Failed to submit.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <div className="rounded border bg-white p-4">
        <h1 className="text-xl font-bold">{desk.name}</h1>
        <p className="mt-1 text-sm text-gray-600">
          Workspace rate: <b>100 EGP/hr</b>. Includes <b>1 free coffee per paid hour</b>.
        </p>
        {desk.laptopSerial ? (
          <p className="mt-1 text-xs text-gray-600">
            Laptop assigned: <b>{desk.laptopSerial}</b>
          </p>
        ) : null}

        <div className="mt-4 grid gap-2">
          <input
            className="w-full rounded border p-2"
            placeholder="Your name (optional)"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
          <input
            className="w-full rounded border p-2"
            placeholder="Phone (optional)"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
          />
        </div>
      </div>

      {upcoming.length > 0 && (
        <div className="mt-4 rounded border bg-white p-4">
          <h2 className="text-lg font-semibold">Upcoming bookings for this desk</h2>
          <div className="mt-2 space-y-2 text-sm">
            {upcoming.slice(0, 5).map((b) => (
              <div key={b.id} className="flex items-start justify-between gap-3 rounded bg-gray-50 p-2">
                <div>
                  <div className="font-medium">{prettyTime(b.startAt)} → {prettyTime(b.endAt)}</div>
                  <div className="text-xs text-gray-600">Status: {b.status}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-600">
            If your preferred slot is taken, try another desk or choose a different time.
          </p>
        </div>
      )}

      <div className="mt-4 rounded border bg-white p-4">
        <h2 className="text-lg font-semibold">When do you want to start?</h2>

        <div className="mt-2 flex gap-2">
          <button
            type="button"
            className={`flex-1 rounded border px-3 py-2 text-sm ${startMode === "NOW" ? "bg-gray-900 text-white" : "bg-white"}`}
            onClick={() => setStartMode("NOW")}
          >
            Now
          </button>
          <button
            type="button"
            className={`flex-1 rounded border px-3 py-2 text-sm ${startMode === "LATER" ? "bg-gray-900 text-white" : "bg-white"}`}
            onClick={() => setStartMode("LATER")}
          >
            Book later
          </button>
        </div>

        {startMode === "LATER" && (
          <div className="mt-3">
            <label className="text-xs text-gray-600">Start time</label>
            <input
              type="datetime-local"
              className="mt-1 w-full rounded border p-2"
              value={startLocal}
              onChange={(e) => setStartLocal(e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-600">
              Booking creates a reserved time slot. If the desk is already booked, you’ll get an error.
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 rounded border bg-white p-4">
        <h2 className="text-lg font-semibold">Select hours + add-ons</h2>

        <div className="mt-3 space-y-3">
          {menuItems.map((mi) => {
            const q = qty[mi.id] || 0;
            const isCoffee = mi.sku === SKU_COFFEE;
            const isHours = mi.sku === SKU_EXTRA_HOUR;

            return (
              <div key={mi.id} className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{mi.name}</div>
                  <div className="text-xs text-gray-600">
                    {isCoffee
                      ? `${formatEGP(mi.price)} (free up to ${hoursQty} / hour(s))`
                      : formatEGP(mi.price)}
                    {mi.description ? ` • ${mi.description}` : ""}
                    {isHours ? " • Required" : ""}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    className="h-8 w-8 rounded border bg-gray-50"
                    onClick={() => dec(mi.id)}
                    type="button"
                    aria-label={`Decrease ${mi.name}`}
                  >
                    –
                  </button>
                  <div className="w-8 text-center">{q}</div>
                  <button
                    className="h-8 w-8 rounded border bg-gray-50"
                    onClick={() => inc(mi.id)}
                    type="button"
                    aria-label={`Increase ${mi.name}`}
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 rounded bg-gray-50 p-3 text-sm">
          <div className="flex justify-between">
            <span>Free coffees applied (preview)</span>
            <span>{preview.freeCoffee}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Total (preview)</span>
            <span>{formatEGP(preview.total)}</span>
          </div>
        </div>

        {err && <div className="mt-3 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{err}</div>}

        <button
          className="mt-4 w-full rounded bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-60"
          disabled={submitting}
          onClick={submit}
          type="button"
        >
          {submitting ? "Submitting..." : startMode === "LATER" ? "Book time slot" : "Check in / Start now"}
        </button>

        {result && (
          <div className="mt-4 rounded border bg-green-50 p-3 text-sm">
            <div className="font-semibold">{startMode === "LATER" ? "Booked!" : "Checked in!"}</div>
            <div className="mt-1">Session ID: {result.id}</div>
            {result.startAt && result.endAt ? (
              <div className="mt-1">
                Time: <b>{prettyTime(result.startAt)}</b> → <b>{prettyTime(result.endAt)}</b>
              </div>
            ) : null}
            <div className="mt-1">
              Total: <b>{formatEGP(result.total)}</b>
            </div>
            <div className="mt-1 text-gray-700">
              Staff can manage this from the dashboard.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
