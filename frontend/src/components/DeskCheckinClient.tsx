"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

type MenuItem = { id: string; sku: string; name: string; description?: string | null; price: number };
type Desk = { id: string; name: string; qrUrl: string; laptopSerial?: string | null };
type UpcomingBooking = { id: string; startAt: string; endAt: string; status: string };
type AvailabilityBooking = { id: string; startAt: string; endAt: string; status: string; customerName?: string | null };

const SKU_EXTRA_HOUR = "001";
const SKU_COFFEE = "002";

const OPEN_HOUR = 7;  // 07:00
const CLOSE_HOUR = 23; // 23:00 (last bookable start is 22:00)
const POLICY_VERSION = "v1";

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

function toDateInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function makeDatetimeLocal(dateStr: string, hour: number) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dateStr}T${pad(hour)}:00`;
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

  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);

  // Availability day view (this desk)
  const [availDate, setAvailDate] = useState(() => toDateInputValue(new Date()));
  const [availBookings, setAvailBookings] = useState<AvailabilityBooking[]>([]);
  const [availLoading, setAvailLoading] = useState(false);

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

  const chosenWindow = useMemo(() => {
    if (startMode !== "LATER") return null;
    const start = new Date(startLocal);
    if (Number.isNaN(start.getTime())) return null;
    const end = new Date(start.getTime() + Math.max(0, hoursQty) * 60 * 60 * 1000);
    return { start, end };
  }, [startMode, startLocal, hoursQty]);

  const clientConflict = useMemo(() => {
    if (!chosenWindow) return null;
    const { start, end } = chosenWindow;
    const overlap = (availBookings || []).some((b) => {
      const bs = new Date(b.startAt);
      const be = new Date(b.endAt);
      return start < be && end > bs;
    });
    return overlap ? "Selected start time overlaps an existing booking on this desk." : null;
  }, [chosenWindow, availBookings]);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    let cancelled = false;

    async function load() {
      setAvailLoading(true);
      try {
        const dayStartLocal = new Date(`${availDate}T00:00:00`);
        const dayEndLocal = new Date(dayStartLocal.getTime() + 24 * 60 * 60 * 1000);
        const qs = new URLSearchParams({
          start: dayStartLocal.toISOString(),
          end: dayEndLocal.toISOString(),
        });

        const res = await fetch(`${base}/public/desks/${desk.id}/availability?${qs.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          if (!cancelled) setAvailBookings([]);
          return;
        }
        const json = await res.json();
        if (!cancelled) setAvailBookings(json.bookings || []);
      } finally {
        if (!cancelled) setAvailLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [desk.id, availDate]);

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

    if (!policyAccepted) {
      setErr("You must accept the laptop usage policy to continue.");
      return;
    }

    if (startMode === "LATER" && clientConflict) {
      setErr(clientConflict);
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
          laptopPolicyAccepted: true,
          laptopPolicyVersion: POLICY_VERSION,
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

      <div className="mt-4 rounded border bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Laptop usage policy</h2>
            <p className="mt-1 text-sm text-gray-600">You must agree before starting or booking a session.</p>
          </div>
          <button
            type="button"
            className="rounded border px-3 py-2 text-sm"
            onClick={() => setShowPolicy((s) => !s)}
          >
            {showPolicy ? "Hide" : "View"}
          </button>
        </div>

        {showPolicy && (
          <div className="mt-3 rounded bg-gray-50 p-3 text-sm text-gray-800">
            <div className="font-semibold">Basic laptop usage policy (v1)</div>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Workspace use only. No illegal activity, harassment, or prohibited content.</li>
              <li>Do not install software, change settings, or plug unknown USB devices without staff approval.</li>
              <li>Log out of accounts when finished. Don’t access other people’s data.</li>
              <li>Keep food/drinks away from the laptop. You may be charged for damage or loss.</li>
              <li>QROO may restrict or end a session for policy violations or security risk.</li>
            </ul>
          </div>
        )}

        <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={policyAccepted}
            onChange={(e) => setPolicyAccepted(e.target.checked)}
          />
          <span>
            I agree to the laptop usage policy (required).
          </span>
        </label>
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
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Desk availability (day view)</h2>
          <input
            type="date"
            className="rounded border p-2 text-sm"
            value={availDate}
            onChange={(e) => setAvailDate(e.target.value)}
          />
        </div>
        <p className="mt-1 text-sm text-gray-600">
          Tap a <b>free</b> slot to pre-fill a booking start time.
        </p>

        {availLoading ? (
          <div className="mt-3 text-sm text-gray-600">Loading availability…</div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => OPEN_HOUR + i).map((h) => {
              const slotStart = new Date(`${availDate}T${String(h).padStart(2, "0")}:00:00`);
              const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
              const now = new Date();

              const booked = (availBookings || []).some((b) => {
                const bs = new Date(b.startAt);
                const be = new Date(b.endAt);
                return slotStart < be && slotEnd > bs;
              });

              const inPast = slotEnd.getTime() <= now.getTime();
              const label = `${String(h).padStart(2, "0")}:00 – ${String(h + 1).padStart(2, "0")}:00`;

              return (
                <button
                  key={h}
                  type="button"
                  disabled={booked || inPast}
                  onClick={() => {
                    setStartMode("LATER");
                    setStartLocal(makeDatetimeLocal(availDate, h));
                  }}
                  className={`rounded border px-3 py-2 text-left text-sm ${
                    booked
                      ? "bg-gray-200 text-gray-600"
                      : inPast
                      ? "bg-gray-50 text-gray-400"
                      : "bg-white hover:bg-gray-50"
                  } disabled:cursor-not-allowed`}
                  title={booked ? "Booked" : inPast ? "Past" : "Free"}
                >
                  <div className="font-medium">{label}</div>
                  <div className="text-xs">
                    {booked ? "Booked" : inPast ? "Past" : "Free"}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {startMode === "LATER" && clientConflict && (
          <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-2 text-sm text-amber-800">
            {clientConflict}
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
