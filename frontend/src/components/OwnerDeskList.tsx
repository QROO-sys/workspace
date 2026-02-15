"use client";

import QRCode from "qrcode.react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Desk = { id: string; name: string; qrUrl: string; laptopSerial?: string | null };

export default function OwnerDeskList({ desks }: { desks: Desk[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [laptopSerial, setLaptopSerial] = useState("");
  const [serials, setSerials] = useState<Record<string, string>>(() => Object.fromEntries(desks.map(d => [d.id, d.laptopSerial || ""])));

  useEffect(() => {
    setSerials(Object.fromEntries(desks.map(d => [d.id, d.laptopSerial || ""])));
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
        body: JSON.stringify({ name, laptopSerial: laptopSerial || undefined }),
      });
      setName("");
      setLaptopSerial("");
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "Failed to create");
    } finally {
      setBusy(false);
    }
  }


async function saveSerial(id: string) {
  setBusy(true);
  setErr(null);
  try {
    const laptopSerial = (serials[id] || "").trim();
    if (!laptopSerial) { setErr("Laptop serial can't be blank."); return; }
    await apiFetch(`/desks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ laptopSerial }),
    });
    router.refresh();
  } catch (e: any) {
    setErr(e?.message || "Failed to update laptop serial");
  } finally {
    setBusy(false);
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
      <form onSubmit={createDesk} className="grid gap-2 sm:grid-cols-3">
        <input className="rounded border p-2" placeholder="New desk name (e.g., Desk 11)" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="rounded border p-2" placeholder="Laptop serial (optional)" value={laptopSerial} onChange={(e) => setLaptopSerial(e.target.value)} />
        <button className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60" disabled={busy} type="submit">
          Add
        </button>
      </form>
      {err && <div className="mt-2 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{err}</div>}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {desks.map((d) => (
          <div key={d.id} className="rounded border bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">{d.name}</div>
                <div className="mt-1 text-xs text-gray-600 break-all">{d.qrUrl}</div>
                <div className="mt-1 text-xs text-gray-700"><b>Laptop:</b> {d.laptopSerial || "—"}</div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    className="w-full rounded border p-2 text-xs"
                    placeholder="Laptop serial"
                    value={serials[d.id] ?? ""}
                    onChange={(e) => setSerials(prev => ({ ...prev, [d.id]: e.target.value }))}
                  />
                  <button
                    className="rounded border px-2 py-2 text-xs"
                    disabled={busy}
                    type="button"
                    onClick={() => saveSerial(d.id)}
                  >
                    Update serial
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
