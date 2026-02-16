import { serverApiFetch } from "@/lib/serverApi";

function formatEGP(v: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(v) + " EGP";
}

export default async function OwnerAnalyticsPage({ searchParams }: { searchParams: { days?: string } }) {
  const days = Number(searchParams?.days || 30) || 30;
  const data = await serverApiFetch(`/analytics/revenue/daily?days=${encodeURIComponent(String(days))}`);
  const hasTotals = !!data?.totals;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Daily revenue analytics</h1>
          <p className="text-sm text-gray-600">Cancelled sessions are excluded from revenue totals.</p>
        </div>
        <form className="flex items-center gap-2" action="/owner/analytics" method="get">
          <label className="text-sm text-gray-700">Days</label>
          <input name="days" className="w-24 rounded border px-2 py-1 text-sm" defaultValue={days} />
          <button className="rounded bg-gray-900 px-3 py-1 text-sm text-white" type="submit">Apply</button>
        </form>
      </div>

      {hasTotals ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded border bg-white p-4">
            <div className="text-sm text-gray-600">Gross (non-cancelled)</div>
            <div className="text-2xl font-bold">{formatEGP(data?.totals?.gross || 0)}</div>
          </div>
          <div className="rounded border bg-white p-4">
            <div className="text-sm text-gray-600">Completed</div>
            <div className="text-2xl font-bold">{formatEGP(data?.totals?.completed || 0)}</div>
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded border bg-white p-4 text-sm text-gray-700">
          Staff view: totals are hidden. You can still view daily revenue below.
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2">Day</th>
              <th className="px-3 py-2">Gross</th>
              <th className="px-3 py-2">Completed</th>
              <th className="px-3 py-2">Sessions</th>
            </tr>
          </thead>
          <tbody>
            {(data?.data || []).map((r: any) => (
              <tr key={r.day} className="border-t">
                <td className="px-3 py-2">{r.day}</td>
                <td className="px-3 py-2">{formatEGP(Number(r.gross || 0))}</td>
                <td className="px-3 py-2">{formatEGP(Number(r.completed || 0))}</td>
                <td className="px-3 py-2">{r.countNonCancelled} / {r.countAll}</td>
              </tr>
            ))}
            {(data?.data || []).length === 0 ? (
              <tr><td className="px-3 py-4 text-gray-600" colSpan={4}>No data yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
