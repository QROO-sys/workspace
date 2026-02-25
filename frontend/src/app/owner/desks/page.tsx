"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { apiFetch } from "@/lib/api";

const OwnerDeskList = dynamic(() => import("@/components/OwnerDeskList"), {
  ssr: false,
  loading: () => (
    <div className="min-h-[60vh] flex items-center justify-center text-sm text-gray-600">
      Loading desks…
    </div>
  ),
});

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

  const laptopSerial =
    typeof raw?.laptopSerial === "string"
      ? raw.laptopSerial
      : typeof raw?.serial === "string"
      ? raw.serial
      : "";

  const hourlyRate = raw?.hourlyRate ?? raw?.rate ?? "";

  return { ...raw, id, name, qrUrl, laptopSerial, hourlyRate };
}

export default function OwnerDesksPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [desks, setDesks] = useState<any[]>([]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setErr(null);
        setLoading(true);

        const res = await apiFetch("/desks", { method: "GET" });
        const items = Array.isArray(res) ? res : res?.desks;
        if (!Array.isArray(items)) throw new Error("Unexpected /desks response shape");

        const normalized = items.map((x, i) => normalizeDesk(x, i)).filter(Boolean);

        if (!alive) return;
        setDesks(normalized);
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
      <div className="min-h-[60vh] flex items-center justify-center text-sm text-gray-600">
        Loading desks…
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-xl w-full rounded border bg-white p-4">
          <div className="font-semibold mb-2">Desks error</div>
          <div className="text-sm text-red-700 break-words">{err}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-2xl font-bold">Desks</div>
        <div className="text-sm text-gray-600">Total: {desks.length}</div>
      </div>
      <OwnerDeskList desks={desks} />
    </div>
  );
}
