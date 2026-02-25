"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

type AnyObj = Record<string, any>;

function toArr(x: any): any[] {
  if (Array.isArray(x)) return x;
  if (Array.isArray(x?.items)) return x.items;
  if (Array.isArray(x?.data)) return x.data;
  if (Array.isArray(x?.orders)) return x.orders;
  return [];
}

function money(n: any) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(v);
}

function Table({
  cols,
  rows,
  empty,
}: {
  cols: { k: string; label: string }[];
  rows: AnyObj[];
  empty: string;
}) {
  if (!rows.length) return <div className="text-sm text-gray-600">{empty}</div>;

  return (
    <div className="overflow-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            {cols.map((c) => (
              <th key={c.k} className="py-2 pr-4 font-medium">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id || r._id || i} className="border-b last:border-b-0">
              {cols.map((c) => (
                <td key={c.k} className="py-2 pr-4 whitespace-nowrap">
                  {String(r?.[c.k] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function OwnerOrdersPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [orders, setOrders] = useState<AnyObj[]>([]);

  const total = useMemo(() => {
    return orders.reduce((acc, o) => {
      const v = Number(o?.total ?? o?.amount ?? o?.sum ?? 0);
      return Number.isFinite(v) ? acc + v : acc;
    }, 0);
  }, [orders]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setErr(null);
        setLoading(true);

        // Backend controller: @Controller('orders')
        const res = await apiFetch("/orders", { method: "GET" });
        const arr = toArr(res);

        const norm = arr.map((o: any) => ({
          ...o,
          desk: String(o?.table?.name ?? o?.desk?.name ?? o?.tableId ?? o?.deskId ?? ""),
          total: money(o?.total ?? o?.amount ?? o?.sum ?? ""),
          created: String(o?.createdAt ?? o?.created ?? ""),
          items: Array.isArray(o?.orderItems) ? o.orderItems.length : "",
        }));

        if (!alive) return;
        setOrders(norm);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Failed to load orders");
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
        Loading orders…
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-xl w-full rounded border bg-white p-4">
          <div className="font-semibold mb-2">Orders error</div>
          <div className="text-sm text-red-700 break-words">{err}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-2xl font-bold">Orders</div>
        <div className="text-sm text-gray-600">
          Total orders: {orders.length} • Total revenue (orders): {money(total)}
        </div>
      </div>

      <Table
        empty="No orders."
        cols={[
          { k: "desk", label: "Desk" },
          { k: "total", label: "Total" },
          { k: "items", label: "Items" },
          { k: "created", label: "Created" },
        ]}
        rows={orders}
      />
    </div>
  );
}
