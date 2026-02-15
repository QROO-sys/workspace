"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TimeSlotGrid from "@/components/TimeSlotGrid";
import { apiFetch } from "@/lib/api";

function formatEGP(v: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(v) + " EGP";
}

export default function DeskCheckinClient({
  desk,
  menuItems,
  upcoming,
  defaultMode = "NOW",
}: {
  desk: any;
  menuItems: any[];
  upcoming: any[];
  defaultMode?: "NOW" | "LATER";
}) {
  const router = useRouter();

  const [startMode, setStartMode] = useState<"NOW" | "LATER">(defaultMode);
  const [dateStr, setDateStr] = useState(() => new Date().toISOString().slice(0, 10));
  const [occupied, setOccupied] = useState<Array<{ startAt: string; endAt: string }>>([]);
  const [selectedStartISO, setSelectedStartISO] = useState<string>("");
  const [availabilityErr, setAvailabilityErr] = useState<string | null>(null);

  const [extraHours, setExtraHours] = useState<number>(1);
  const [coffeeQty, setCoffeeQty] = useState<number>(0);
  const [otherQty, setOtherQty] = useState<Record<string, number>>({});

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [idFile, setIdFile] = useState<File | null>(null);
  const [idPath, setIdPath] = useState<string>("");
  const [idBusy, setIdBusy] = useState(false);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const extraHourMi = useMemo(
    () =>
      menuItems.find((m) => {
        const sku = (m.sku || "").toUpperCase();
        const name = (m.name || "").toLowerCase();
        return sku === "HOUR" || sku === "001" || name === "extra hour";
      }),
    [menuItems]
  );
  const coffeeMi = useMemo(
    () =>
      menuItems.find((m) => {
        const sku = (m.sku || "").toUpperCase();
        const name = (m.name || "").toLowerCase();
        return sku === "COFFEE" || sku === "002" || name === "coffee";
      }),
    [menuItems]
  );

  const otherItems = useMemo(() => {
    const set = new Set([extraHourMi?.id, coffeeMi?.id].filter(Boolean) as string[]);
    return menuItems.filter((m) => !set.has(m.id));
  }, [menuItems, extraHourMi?.id, coffeeMi?.id]);

  const pricePreview = useMemo(() => {
    const rate = Number(desk?.hourlyRate || 0);
    const hours = Math.max(1, Number(extraHours || 1));
    let total = rate * hours;
    if (coffeeMi) total += Number(coffeeMi.price || 0) * Math.max(0, Number(coffeeQty || 0));
    for (const it of otherItems) {
      const q = Math.max(0, Number(otherQty[it.id] || 0));
      total += Number(it.price || 0) * q;
    }
    return total;
  }, [desk?.hourlyRate, extraHours, coffeeMi, coffeeQty, otherItems, otherQty]);

  const selectedStartDate = selectedStartISO ? new Date(selectedStartISO) : null;
  const selectedDay = useMemo(() => new Date(`${dateStr}T00:00:00`), [dateStr]);

  useEffect(() => {
    if (startMode !== "LATER") return;

    let cancelled = false;
    setAvailabilityErr(null);

    apiFetch(`/public/desks/${desk.id}/availability?date=${encodeURIComponent(dateStr)}`)
      .then((d) => {
        if (cancelled) return;
        setOccupied((d?.occupied || []).map((x: any) => ({ startAt: x.startAt, endAt: x.endAt })));
      })
      .catch((e) => {
        if (cancelled) return;
        setAvailabilityErr(e?.message || "Failed to load availability");
      });

    return () => {
      cancelled = true;
    };
  }, [startMode, dateStr, desk.id]);

  async function uploadNationalIdIfNeeded() {
    if (!idFile) return "";
    if (idPath) return idPath;

    setIdBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", idFile);

      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const res = await fetch(`${base}/public/uploads/national-id`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error("Upload failed");
      const d = await res.json();
      const p = d?.path || "";
      setIdPath(p);
      return p;
    } finally {
      setIdBusy(false);
    }
  }

  async function submitOrder() {
    setErr(null);

    if (!extraHourMi) {
      setErr("Missing 'Extra hour' menu item (sku HOUR). Add it in Admin → Menu.");
      return;
    }

    if (!customerName.trim() || !customerPhone.trim()) {
      setErr("Name and phone are required.");
      return;
    }

    let startAt: string | undefined;
    if (startMode === "LATER") {
      if (!selectedStartISO) {
        setErr("Pick a start time first.");
        return;
      }
      startAt = new Date(selectedStartISO).toISOString();
    }

    const items: Array<{ menuItemId: string; quantity: number }> = [];
    items.push({ menuItemId: extraHourMi.id, quantity: Math.max(1, Number(extraHours || 1)) });
    if (coffeeMi && coffeeQty > 0) items.push({ menuItemId: coffeeMi.id, quantity: Math.max(0, Number(coffeeQty || 0)) });
    for (const it of otherItems) {
      const q = Math.max(0, Number(otherQty[it.id] || 0));
      if (q > 0) items.push({ menuItemId: it.id, quantity: q });
    }

    setBusy(true);
    try {
      const customerNationalIdPath = await uploadNationalIdIfNeeded();
      const order = await apiFetch("/orders/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: desk.id,
          items,
          startAt,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerNationalIdPath: customerNationalIdPath || undefined,
        }),
      });

      router.push(`/checkout?orderId=${encodeURIComponent(order.id)}`);
    } catch (e: any) {
      setErr(e?.message || "Failed to place order");
    } finally {
      setBusy(false);
    }
  }

  async function sendQuickRequest(requestType: "CALL_STAFF" | "WATER" | "BILL") {
    setErr(null);
    try {
      await apiFetch(`/public/tables/${desk.id}/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType,
          customerName: customerName.trim() || undefined,
          customerPhone: customerPhone.trim() || undefined,
        }),
      });
    } catch (e: any) {
      setErr(e?.message || "Failed to send request");
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-2xl font-bold">{desk.name}</h1>
      <p className="text-sm text-gray-600">Use this QR page to extend time, order items, or book later.</p>

      {upcoming?.length ? (
        <div className="mt-4 rounded border bg-white p-4">
          <div className="text-sm font-semibold">Upcoming bookings</div>
          <ul className="mt-2 space-y-1 text-sm text-gray-700">
            {upcoming.slice(0, 5).map((b: any) => (
              <li key={b.id}>
                {new Date(b.startAt).toLocaleString()} → {new Date(b.endAt).toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {err ? <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div> : null}

      <div className="mt-4 rounded border bg-white p-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium">Session</label>
          <select
            className="rounded border px-3 py-2 text-sm"
            value={startMode}
            onChange={(e) => {
              const v = e.target.value as any;
              setStartMode(v);
              if (v === "NOW") setSelectedStartISO("");
            }}
          >
            <option value="NOW">Start now</option>
            <option value="LATER">Book later</option>
          </select>
        </div>

        {startMode === "LATER" ? (
          <div className="mt-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <label className="text-sm font-medium">Pick a day</label>
                <input
                  className="mt-1 w-full rounded border px-3 py-2"
                  type="date"
                  value={dateStr}
                  onChange={(e) => {
                    setDateStr(e.target.value);
                    setSelectedStartISO("");
                  }}
                />
              </div>
              <div className="text-xs text-gray-600">Green = available, red = unavailable</div>
            </div>

            {availabilityErr ? (
              <div className="mt-2 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{availabilityErr}</div>
            ) : null}

            <div className="mt-3">
              <TimeSlotGrid
                date={selectedDay}
                occupied={occupied}
                durationHours={Math.max(1, Number(extraHours || 1))}
                selected={selectedStartDate}
                onSelect={(d) => setSelectedStartISO(d.toISOString())}
              />
            </div>
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Hours</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              type="number"
              min={1}
              value={extraHours}
              onChange={(e) => setExtraHours(Number(e.target.value || 1))}
            />
            <div className="mt-1 text-xs text-gray-600">Rate: {formatEGP(Number(desk.hourlyRate || 0))}/hour</div>
          </div>

          <div>
            <label className="text-sm font-medium">Coffee</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              type="number"
              min={0}
              value={coffeeQty}
              onChange={(e) => setCoffeeQty(Number(e.target.value || 0))}
            />
            <div className="mt-1 text-xs text-gray-600">{coffeeMi ? `Coffee: ${formatEGP(Number(coffeeMi.price || 0))}` : "Coffee item not set"}</div>
          </div>
        </div>

        {otherItems.length ? (
          <div className="mt-4">
            <div className="text-sm font-medium">Other items</div>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {otherItems.map((it) => (
                <div key={it.id} className="rounded border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">{it.name}</div>
                      <div className="text-xs text-gray-600">{formatEGP(Number(it.price || 0))}</div>
                    </div>
                    <input
                      className="w-20 rounded border px-2 py-1"
                      type="number"
                      min={0}
                      value={otherQty[it.id] || 0}
                      onChange={(e) => setOtherQty((prev) => ({ ...prev, [it.id]: Number(e.target.value || 0) }))}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Your name</label>
            <input className="mt-1 w-full rounded border px-3 py-2" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Phone</label>
            <input className="mt-1 w-full rounded border px-3 py-2" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
          </div>
        </div>

        {desk?.laptopSerial ? (
          <div className="mt-4 rounded border bg-gray-50 p-3">
            <div className="text-sm font-medium">Laptop use</div>
            <div className="mt-1 text-xs text-gray-600">This desk has a laptop assigned ({desk.laptopSerial}). You can upload a National ID photo for verification.</div>
            <input
              className="mt-2 w-full"
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setIdFile(e.target.files?.[0] || null)}
            />
            {idBusy ? <div className="mt-2 text-xs text-gray-600">Uploading…</div> : null}
            {idPath ? <div className="mt-2 text-xs text-gray-600">Uploaded: {idPath}</div> : null}
          </div>
        ) : null}

        <div className="mt-4 rounded border bg-gray-50 p-3">
          <div className="text-sm font-medium">Quick requests (alerts admin)</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className="rounded border px-3 py-1 text-sm" onClick={() => sendQuickRequest("CALL_STAFF")}>Call staff</button>
            <button type="button" className="rounded border px-3 py-1 text-sm" onClick={() => sendQuickRequest("WATER")}>Water</button>
            <button type="button" className="rounded border px-3 py-1 text-sm" onClick={() => sendQuickRequest("BILL")}>Bill</button>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-gray-600">Total</div>
            <div className="text-xl font-bold">{formatEGP(pricePreview)}</div>
          </div>
          <button
            className="rounded bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-60"
            disabled={busy || idBusy}
            onClick={submitOrder}
            type="button"
          >
            {busy ? "Submitting…" : "Proceed to checkout"}
          </button>
        </div>
      </div>

      <div className="mt-6 text-xs text-gray-600">
        Tip: Admin can see live alerts in Admin → Requests. SMS alerts require SMS_PROVIDER and SMS_ADMIN_TO in the backend .env.
      </div>
    </div>
  );
}
