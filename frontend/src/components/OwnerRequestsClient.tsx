"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api";

export default function OwnerRequestsClient({ requests }: { requests: any[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function resolve(id: string) {
    setErr(null);
    setBusyId(id);
    try {
      await apiFetch(`/table-requests/${id}/resolve`, { method: "PATCH" });
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "Failed to resolve request");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mt-6">
      {err && <div className="mb-3 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{err}</div>}

      <div className="space-y-3">
        {requests.map((r) => (
          <div key={r.id} className="rounded border bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-semibold">{r.table?.name || "Desk"}</div>
                <div className="text-sm text-gray-700">{r.requestType}</div>
                <div className="mt-1 text-xs text-gray-600">{new Date(r.createdAt).toLocaleString()}</div>
              </div>
              <button
                className="rounded bg-green-600 px-3 py-1 text-sm text-white disabled:opacity-60"
                disabled={busyId === r.id}
                onClick={() => resolve(r.id)}
                type="button"
              >
                Mark resolved
              </button>
            </div>
          </div>
        ))}
        {requests.length === 0 && <div className="text-sm text-gray-600">No active requests.</div>}
      </div>
    </div>
  );
}
