"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { apiFetch } from "@/lib/api";

// Minimal shape that OwnerDeskList expects.
// Critical: name must be a string (not optional).
type Desk = {
  id: string;
  name: string;
  qrUrl?: string | null;
  laptopSerial?: string | null;
  hourlyRate?: number | null;
  [k: string]: any;
};

const OwnerDeskList = dynamic(() => import("@/components/OwnerDeskList"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center text-sm text-gray-600">
      Loading dashboard…
    </div>
  ),
});

function normalizeDesk(raw: any, idx: number): Desk | null {
  if (!raw) return null;

  const id = String(raw.id || raw._id || "");
  if (!id) return null;

  const name =
    typeof raw.name === "string" && raw.name.trim()
      ? raw.name.trim()
      : `Desk ${idx + 1}`;

  return {
    ...raw,
    id,
    name,
    qrUrl: raw.qrUrl ?? raw.qr_url ?? null,
    laptopSerial: raw.laptopSerial ?? raw.laptop_serial ?? null,
    hourlyRate: raw.hourlyRate ?? raw.hourly_rate ?? null,
  };
}

export default function OwnerDashboardPage() {
  const [desks, setDesks] = useState<Desk[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setErr(null);
        setLoading(true);

        const endpoints = ["/owner/desks", "/desks", "/public/desks"];

        let lastError: any = null;

        for (const ep of endpoints) {
          try {
            const res = await apiFetch(ep, { method: "GET" });
            const items = Array.isArray(res) ? res : res?.desks;

            if (Array.isArray(items)) {
              const normalized = items
                .map((x, i) => normalizeDesk(x, i))
                .filter(Boolean) as Desk[];

              if (alive) setDesks(normalized);
              lastError = null;
              break;
            }
          } catch (e) {
            lastError = e;
          }
        }

        if (lastError) throw lastError;
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Failed to load desks");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-600">
        Loading dashboard…
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-lg w-full rounded border bg-white p-4">
          <div className="font-semibold mb-2">Dashboard error</div>
          <div className="text-sm text-red-700 break-words">{err}</div>
        </div>
      </div>
    );
  }

  // OwnerDeskList expects desks prop.
  return <OwnerDeskList desks={desks} />;
}
