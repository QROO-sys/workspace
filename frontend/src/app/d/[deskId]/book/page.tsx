"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function slotLabel(dateISO: string, hour: number) {
  return `${dateISO} ${pad(hour)}:00`;
}

export default function DeskBookingPage() {
  const params = useParams<{ deskId: string }>();
  const deskId = String(params?.deskId || "");

  const [dateISO, setDateISO] = useState(() => toISODate(new Date()));
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [hoursCount, setHoursCount] = useState(1);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const slots = useMemo(() => {
    // 9 AM to 5 PM start slots (9..16). End at 17:00.
    const hours: number[] = [];
    for (let h = 9; h <= 16; h++) hours.push(h);
    return hours;
  }, []);

  useEffect(() => {
    // Just a sanity check load: confirm desk exists via public endpoint without date param.
    // If your public endpoint differs, booking submission still works.
    (async () => {
      try {
        await apiFetch(`/public?deskId=${encodeURIComponent(deskId)}`, { method: "GET" });
      } catch {
        // ignore - booking API will still validate.
      }
    })();
  }, [deskId]);

  async function submitBooking() {
    setErr(null);

    if (!deskId) {
      setErr("Missing deskId.");
      return;
    }
    if (!name.trim() || !phone.trim()) {
      setErr("Name and phone are required.");
      return;
    }
    if (selectedHour == null) {
      setErr("Select a start time.");
      return;
    }
    if (!Number.isFinite(hoursCount) || hoursCount < 1 || hoursCount > 8) {
      setErr("Hours must be between 1 and 8.");
      return;
    }
    if (selectedHour + hoursCount > 17) {
      setErr("Booking must end by 17:00.");
      return;
    }

    const startAt = new Date(`${dateISO}T${pad(selectedHour)}:00:00`).toISOString();
    const endAt = new Date(`${dateISO}T${pad(selectedHour + hoursCount)}:00:00`).toISOString();

    setBusy(true);
    try {
      // Backend controller: @Controller('bookings')
      await apiFetch("/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: deskId,
          startAt,
          endAt,
          customerName: name.trim(),
          customerPhone: phone.trim(),
        }),
      });

      alert("Booking created.");
      setSelectedHour(null);
      setHoursCount(1);
    } catch (e: any) {
      setErr(e?.message || "Booking failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      <div className="rounded border bg-white p-4">
        <div className="text-2xl font-bold">Book Desk</div>
        <div className="text-sm text-gray-600">Desk ID: {deskId}</div>
      </div>

      <div className="rounded border bg-white p-4 space-y-3">
        <div className="font-semibold">Booking Details</div>

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
          Name
          <input
            className="mt-1 w-full rounded border p-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <label className="block text-sm">
          Phone
          <input
            className="mt-1 w-full rounded border p-2"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>

        <label className="block text-sm">
          Hours
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
      </div>

      <div className="rounded border bg-white p-4">
        <div className="font-semibold mb-3">Select Start Time (9:00–17:00)</div>

        <div className="grid grid-cols-2 gap-2">
          {slots.map((h) => {
            const disabled = h + hoursCount > 17;
            const selected = selectedHour === h;

            return (
              <button
                key={h}
                type="button"
                disabled={disabled}
                onClick={() => setSelectedHour(h)}
                className={
                  "rounded border px-3 py-2 text-sm disabled:opacity-50 " +
                  (selected ? "bg-gray-900 text-white" : "hover:bg-gray-50")
                }
              >
                {slotLabel(dateISO, h)}
              </button>
            );
          })}
        </div>

        {err && (
          <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
            {err}
          </div>
        )}

        <button
          className="mt-4 rounded bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-60"
          disabled={busy}
          onClick={submitBooking}
          type="button"
        >
          {busy ? "Booking…" : "Confirm Booking"}
        </button>

        <div className="mt-3 text-xs text-gray-500">
          Availability is enforced by the server (no overlaps). If a slot is taken, the API will reject it.
        </div>
      </div>
    </div>
  );
}
