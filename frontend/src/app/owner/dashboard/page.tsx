"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { apiFetch } from "@/lib/api";

const OwnerDeskList = dynamic(() => import("@/components/OwnerDeskList"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center text-sm text-gray-600">
      Loading dashboard…
    </div>
  ),
});

// Normalize API data into what OwnerDeskList expects.
// Key requirements from build errors:
// - name must be string
// - qrUrl must be string
function normalizeDesk(raw: any, idx: number) {
  const id = String(raw?.id || raw?._id || "");
  if (!id) return null;

  const name =
    typeof raw?.name === "string" && raw.name.trim()
      ? raw.name.trim()
      : `Desk ${idx + 1}`;

  const qrUrl =
    typeof raw?.qrUrl === "string" && raw.qrUrl.trim()
      ? raw.qrUrl.trim()
      : `${window.location.origin}/d/${id}`;

  return {
    ...raw,
    id,
    name,
    qrUrl,
  };
}

export default function OwnerDashboardPage() {
  const [desks, setDesks] = useState<any[]>([]);
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
                .filter(Boolean);

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

  return <OwnerDeskList desks={desks} />;
}
