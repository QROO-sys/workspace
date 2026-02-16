"use client";

import QRCode from "qrcode.react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Desk = { id: string; name: string; qrUrl: string; laptopSerial?: string | null; hourlyRate?: number };

export default function OwnerDeskList({ desks }: { desks: Desk[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [laptopSerial, setLaptopSerial] = useState("");
  const [hourlyRate, setHourlyRate] = useState("100");
  const [bulkRate, setBulkRate] = useState("100");
  const [serials, setSerials] = useState<Record<string, string>>(() => Object.fromEntries(desks.map(d => [d.id, d.laptopSerial || ""])));
  const [rates, setRates] = useState<Record<string, string>>(() => Object.fromEntries(desks.map(d => [d.id, String(d.hourlyRate ?? 100)])));

  useEffect(() => {
    setSerials(Object.fromEntries(desks.map(d => [d.id, d.laptopSerial || ""])));
    setRates(Object.fromEntries(desks.map(d => [d.id, String(d.hourlyRate ?? 100)])));
  }, [desks]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function createDesk(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!name.trim()) return;

    setBusy(true);
    try {
      await apiFetch("/desks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          laptopSerial: laptopSerial || undefined,
          hourlyRate: hourlyRate ? Number(hourlyRate) : undefined,
        }),
      });
      setName("");
      setLaptopSerial("");
      setHourlyRate("100");
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "Failed to create");
    } finally {
      setBusy(false);
    }
  }


async function saveDesk(id: string) {
  setBusy(true);
  setErr(null);
  try {
    const laptopSerial = (serials[id] || "").trim();
    const hourlyRate = Number(rates[id] || 0);
    if (!Number.isFinite(hourlyRate) || hourlyRate < 0) { setErr("Hourly rate must be a valid number."); return; }
    await apiFetch(`/desks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ laptopSerial: laptopSerial || null, hourlyRate }),
    });
    router.refresh();
  } catch (e: any) {
    setErr(e?.message || "Failed to update desk");
  } finally {
    setBusy(false);
  }

  async function setAllRates() {
    setBusy(true);
    setErr(null);
    try {
      const hr = Number(bulkRate || 0);
      if (!Number.isFinite(hr) || hr < 0) {
        setErr('Hourly rate must be a valid number.');
        return;
      }
      await apiFetch(`/desks/bulk/hourly-rate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hourlyRate: hr }),
      });
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || 'Failed to update all rates');
    } finally {
      setBusy(false);
    }
  }
}

  async function removeDesk(id: string) {
    if (!confirm("Delete this desk?")) return;
    setBusy(true);
    setErr(null);
    try {
      await apiFetch(`/desks/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "Failed to delete");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6">
      <form onSubmit={createDesk} className="grid gap-2 sm:grid-cols-4">
        <input className="rounded border p-2" placeholder="New desk name (e.g., Desk 11)" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="rounded border p-2" placeholder="Laptop serial (optional)" value={laptopSerial} onChange={(e) => setLaptopSerial(e.target.value)} />
        <input className="rounded border p-2" placeholder="Hourly rate (EGP)" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} />
        <button className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60" disabled={busy} type="submit">
          Add
        </button>
      </form>
      {err && <div className="mt-2 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{err}</div>}

      <div className="mt-3 flex flex-wrap items-center gap-2 rounded border bg-white p-3">
        <div className="text-sm font-medium">Set hourly rate for ALL desks</div>
        <input
          className="w-28 rounded border p-2 text-sm"
          placeholder="EGP/hr"
          value={bulkRate}
          onChange={(e) => setBulkRate(e.target.value)}
        />
        <button
          className="rounded border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
          disabled={busy}
          type="button"
          onClick={setAllRates}
        >
          Apply
        </button>
        <div className="text-xs text-gray-600">This controls the session price used for “Extra hour”.</div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {desks.map((d) => (
          <div key={d.id} className="rounded border bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">{d.name}</div>
                <div className="mt-1 text-xs text-gray-600 break-all">{d.qrUrl}</div>
                <div className="mt-1 text-xs text-gray-700"><b>Laptop:</b> {d.laptopSerial || "—"}</div>
                <div className="mt-1 text-xs text-gray-700"><b>Hourly rate:</b> {d.hourlyRate ?? 100} EGP/hr</div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    className="w-full rounded border p-2 text-xs"
                    placeholder="Laptop serial"
                    value={serials[d.id] ?? ""}
                    onChange={(e) => setSerials(prev => ({ ...prev, [d.id]: e.target.value }))}
                  />
                  <input
                    className="w-28 rounded border p-2 text-xs"
                    placeholder="EGP/hr"
                    value={rates[d.id] ?? "100"}
                    onChange={(e) => setRates(prev => ({ ...prev, [d.id]: e.target.value }))}
                  />
                  <button
                    className="rounded border px-2 py-2 text-xs"
                    disabled={busy}
                    type="button"
                    onClick={() => saveDesk(d.id)}
                  >
                    Save
                  </button>
                </div>
              </div>
              <button
                className="rounded border px-2 py-1 text-xs"
                onClick={() => removeDesk(d.id)}
                disabled={busy}
                type="button"
              >
                Delete
              </button>
            </div>

            <div className="mt-4 flex items-center justify-center rounded bg-gray-50 p-4">
              <QRCode value={d.qrUrl || `${window.location.origin}/d/${d.id}`} size={160} />
            </div>

            <div className="mt-3 flex justify-between text-xs text-gray-600">
              <a className="underline" href={`/d/${d.id}`} target="_blank" rel="noreferrer">
                Open guest page
              </a>
              <button
                className="underline"
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(d.qrUrl || `${window.location.origin}/d/${d.id}`);
                  alert("Link copied");
                }}
              >
                Copy link
              </button>
            </div>
          </div>
        ))}
      </div>

      {desks.length === 0 && <div className="mt-6 text-sm text-gray-600">No desks yet. Add one above.</div>}
    </div>
  );
}
