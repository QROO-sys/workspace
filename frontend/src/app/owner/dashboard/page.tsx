"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { apiFetch } from "@/lib/api";
import type { Desk } from "@/components/OwnerDeskList";

const OwnerDeskList = dynamic(() => import("@/components/OwnerDeskList"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center text-sm text-gray-600">
      Loading dashboard…
    </div>
  ),
});

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

            // API might return an array or { desks: [...] }
            const items = Array.isArray(res) ? res : res?.desks;

            if (Array.isArray(items)) {
              // We trust API shape matches Desk; if not, you'll see runtime issues
              if (alive) setDesks(items as Desk[]);
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
          <div className="mt-3 text-sm text-gray-600">
            If you just logged in, ensure your JWT is stored and sent as an
            Authorization header on API requests.
          </div>
        </div>
      </div>
    );
  }

  return <OwnerDeskList desks={desks} />;
}
