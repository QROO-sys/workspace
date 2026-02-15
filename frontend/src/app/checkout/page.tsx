import Link from "next/link";

function formatEGP(v: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(v) + " EGP";
}

export default async function CheckoutPage({ searchParams }: { searchParams: { orderId?: string } }) {
  const orderId = searchParams?.orderId;
  if (!orderId) {
    return (
      <div className="mx-auto max-w-md px-6 py-10">
        <h1 className="text-xl font-bold">Checkout</h1>
        <p className="mt-2 text-sm text-gray-700">Missing order id.</p>
        <Link className="mt-4 inline-block text-sm underline" href="/">Back home</Link>
      </div>
    );
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const res = await fetch(`${apiBase}/public/orders/${orderId}`, { cache: "no-store" });

  if (!res.ok) {
    return (
      <div className="mx-auto max-w-md px-6 py-10">
        <h1 className="text-xl font-bold">Checkout</h1>
        <p className="mt-2 text-sm text-gray-700">Could not load this order.</p>
        <Link className="mt-4 inline-block text-sm underline" href="/">Back home</Link>
      </div>
    );
  }

  const data = await res.json();
  const o = data?.order;

  return (
    <div className="mx-auto max-w-md px-6 py-10">
      <h1 className="text-2xl font-bold">Checkout</h1>
      <p className="mt-2 text-sm text-gray-600">Your request has been sent to the admin. Please proceed to payment.</p>

      <div className="mt-5 rounded border bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-semibold">{o?.table?.name || "Desk"}</div>
            <div className="text-xs text-gray-600">Order #{String(o?.id || "").slice(0, 8)}</div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold">{formatEGP(Number(o?.total || 0))}</div>
            <div className="text-xs text-gray-600">Status: {o?.status}</div>
          </div>
        </div>

        {(o?.startAt && o?.endAt) ? (
          <div className="mt-2 text-xs text-gray-600">
            Booking: {new Date(o.startAt).toLocaleString()} → {new Date(o.endAt).toLocaleString()}
          </div>
        ) : null}

        <div className="mt-4 space-y-1 text-sm">
          {(o?.orderItems || []).map((li: any, idx: number) => (
            <div key={li?.id || idx} className="flex justify-between text-gray-700">
              <span>{li?.menuItem?.name || "Item"} × {li?.quantity}</span>
              <span>{formatEGP(Number(li?.price || 0) * Number(li?.quantity || 0))}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link className="rounded bg-gray-900 px-4 py-2 text-sm text-white" href={`/d/${o?.tableId || ""}`}>Back to desk</Link>
        <Link className="rounded border px-4 py-2 text-sm" href="/">Home</Link>
      </div>

      <div className="mt-4 text-xs text-gray-600">
        Note: This MVP does not process card payments. Pay in cash or via your preferred method at the front desk.
      </div>
    </div>
  );
}
