import { serverApiFetch } from "@/lib/serverApi";

function formatEGP(v: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(v) + " EGP";
}

export default async function OwnerDashboardPage() {
  const [desks, orders] = await Promise.all([
    serverApiFetch("/desks"),
    serverApiFetch("/orders"),
  ]);

  const revenue = (orders || [])
    .filter((o: any) => o.status !== "CANCELLED")
    .reduce((sum: number, o: any) => sum + (o.total || 0), 0);
  const pending = (orders || []).filter((o: any) => o.status === "PENDING").length;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-gray-600">QROO Workspace sessions (orders) per desk.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded border bg-white p-4">
          <div className="text-sm text-gray-600">Desks</div>
          <div className="text-2xl font-bold">{desks?.length || 0}</div>
        </div>
        <div className="rounded border bg-white p-4">
          <div className="text-sm text-gray-600">Pending sessions</div>
          <div className="text-2xl font-bold">{pending}</div>
        </div>
        <div className="rounded border bg-white p-4">
          <div className="text-sm text-gray-600">Total revenue (all time)</div>
          <div className="text-2xl font-bold">{formatEGP(revenue)}</div>
        </div>
      </div>

      <div className="mt-6 rounded border bg-white p-4">
        <div className="font-semibold">Latest sessions</div>
        <div className="mt-3 space-y-2">
          {(orders || []).slice(0, 10).map((o: any) => (
            <div key={o.id} className="flex items-center justify-between border-b pb-2">
              <div>
                <div className="font-medium">{o.table?.name || "Desk"}</div>
                <div className="text-xs text-gray-600">{new Date(o.createdAt).toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{formatEGP(o.total)}</div>
                <div className="text-xs text-gray-600">{o.status}</div>
              </div>
            </div>
          ))}
          {(orders || []).length === 0 && <div className="text-sm text-gray-600">No sessions yet.</div>}
        </div>
      </div>
    </div>
  );
}
