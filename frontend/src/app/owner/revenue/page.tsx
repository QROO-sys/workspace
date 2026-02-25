"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type AnyObj = Record<string, any>;

function toArr(x: any): any[] {
  if (Array.isArray(x)) return x;
  if (Array.isArray(x?.items)) return x.items;
  if (Array.isArray(x?.data)) return x.data;
  return [];
}

export default function OwnerRevenuePage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [daily, setDaily] = useState<AnyObj[]>([]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setErr(null);
        setLoading(true);

        // Backend controller: @Controller('analytics')
        // Endpoint: GET analytics/revenue/daily
        const res = await apiFetch("/analytics/revenue/daily", { method: "GET" });
        const arr = toArr(res);

        if (!alive) return;
        setDaily(arr);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Failed to load revenue");
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
      <div className="min-h-[60vh] flex items-center justify-center text-sm text-gray-600">
        Loading revenue…
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-xl w-full rounded border bg-white p-4">
          <div className="font-semibold mb-2">Revenue error</div>
          <div className="text-sm text-red-700 break-words">{err}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-2xl font-bold">Revenue</div>
        <div className="text-sm text-gray-600">
          Source: <code>GET /analytics/revenue/daily</code>
        </div>
      </div>

      <pre className="text-xs bg-white border rounded p-3 overflow-auto">
        {JSON.stringify(daily, null, 2)}
      </pre>
    </div>
  );
}
