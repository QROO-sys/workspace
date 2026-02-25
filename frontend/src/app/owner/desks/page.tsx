"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

let QRCode: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  QRCode = require("react-qr-code").default;
} catch {
  QRCode = null;
}

type DeskCard = {
  id: string;
  name: string;
  laptopSerial: string;
  qrUrl: string;
  isPlaceholder?: boolean;
};

function pad3(n: number) {
  return String(n).padStart(3, "0");
}

export default function OwnerDesksPage() {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [desks, setDesks] = useState<DeskCard[]>([]);

  async function load() {
    setErr(null);
    setLoading(true);

    try {
      const res = await apiFetch("/desks", { method: "GET" }).catch(() => ({ desks: [] }));
      const arr = Array.isArray(res) ? res : res?.desks;
      const list = Array.isArray(arr) ? arr : [];

      const normalized = list.map((d: any, i: number) => {
        const id = String(d?.id ?? d?._id ?? `desk-${i + 1}`);
        const name = String(d?.name ?? `Desk ${i + 1}`);
        const laptopSerial = String(d?.laptopSerial ?? d?.serial ?? `LAP-${pad3(i + 1)}`);
        const qrUrlRaw = String(d?.qrUrl ?? "");
        const qrUrl = qrUrlRaw && qrUrlRaw !== "undefined" ? qrUrlRaw : `${origin}/d/${id}`;
        return { id, name, laptopSerial, qrUrl } as DeskCard;
      });

      // Always show exactly 10 cards
      const out: DeskCard[] = [];
      for (let i = 0; i < 10; i++) {
        const existing = normalized[i];
        if (existing && existing.id) {
          out.push({
            ...existing,
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

      setDesks(out);
      if (list.length === 0) {
        setErr("No desks returned from /desks. Seed the 10 desks in the database to enable booking and real IDs.");
      }
    } catch (e: any) {
      setErr(e?.message || "Failed to load desks");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canRenderQr = useMemo(() => !!QRCode, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-sm text-gray-600">
        Loading desks…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-bold">Desks</div>
          <div className="text-sm text-gray-600">10 desk cards with QR codes for guest ordering.</div>
        </div>
        <button className="rounded border px-3 py-2 text-sm hover:bg-gray-50" onClick={load} type="button">
          Refresh
        </button>
      </div>

      {err && (
        <div className="rounded border bg-red-50 p-3 text-sm text-red-800 border-red-200">
          {err}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {desks.map((d) => (
          <div key={d.id} className="rounded border bg-white p-4">
            <div className="font-semibold">{d.name}</div>
            <div className="text-xs text-gray-600 mt-1">Laptop: {d.laptopSerial}</div>

            <div className="mt-3 rounded bg-gray-50 p-3 flex items-center justify-center">
              {canRenderQr ? (
                <QRCode value={d.qrUrl} size={140} />
              ) : (
                <div className="text-xs text-gray-600 text-center">
                  QR lib not installed.
                  <div className="mt-1">Use the link below.</div>
                </div>
              )}
            </div>

            <a className="mt-3 block text-xs underline break-all" href={d.qrUrl} target="_blank" rel="noreferrer">
              {d.qrUrl}
            </a>

            {d.isPlaceholder && (
              <div className="mt-2 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2">
                Placeholder desk (not in DB yet)
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
