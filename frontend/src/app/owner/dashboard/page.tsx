"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

type AnyObj = Record<string, any>;

function toArr(x: any): any[] {
  if (Array.isArray(x)) return x;
  if (Array.isArray(x?.items)) return x.items;
  if (Array.isArray(x?.data)) return x.data;
  if (Array.isArray(x?.desks)) return x.desks;
  if (Array.isArray(x?.bookings)) return x.bookings;
  if (Array.isArray(x?.orders)) return x.orders;
  if (Array.isArray(x?.menuItems)) return x.menuItems;
  return [];
}

function money(n: any) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(v);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded border bg-white p-4">
      <div className="font-semibold mb-3">{title}</div>
      {children}
    </div>
  );
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

export default function OwnerDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [desks, setDesks] = useState<AnyObj[]>([]);
  const [menuItems, setMenuItems] = useState<AnyObj[]>([]);
  const [bookings, setBookings] = useState<AnyObj[]>([]);
  const [orders, setOrders] = useState<AnyObj[]>([]);
  const [revenueDaily, setRevenueDaily] = useState<AnyObj[]>([]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setErr(null);
        setLoading(true);

        // These match your Nest controllers:
        const [desksRes, menuRes, bookingsRes, ordersRes] = await Promise.all([
          apiFetch("/desks", { method: "GET" }),
          apiFetch("/menu-items", { method: "GET" }),
          apiFetch("/bookings", { method: "GET" }),
          apiFetch("/orders", { method: "GET" }),
        ]);

        let revenueRes: any = null;
        try {
          revenueRes = await apiFetch("/analytics/revenue/daily", { method: "GET" });
        } catch {
          revenueRes = null;
        }

        if (!alive) return;

        const desksArr = toArr(desksRes);
        const menuArr = toArr(menuRes);
        const bookingsArr = toArr(bookingsRes);
        const ordersArr = toArr(ordersRes);
        const revenueArr = toArr(revenueRes);

        // Normalize desk fields you care about
        const normDesks = desksArr.map((d: any, i: number) => {
          const id = String(d?.id ?? d?._id ?? "");
          const name = String(d?.name ?? `Desk ${i + 1}`);
          const qrUrl =
            typeof d?.qrUrl === "string" && d.qrUrl
              ? d.qrUrl
              : `${window.location.origin}/d/${id}`;
          const laptopSerial = String(d?.laptopSerial ?? d?.serial ?? "");
          const hourlyRate = d?.hourlyRate ?? d?.rate ?? "";
          return { ...d, id, name, qrUrl, laptopSerial, hourlyRate };
        });

        setDesks(normDesks);

        // Normalize menu items (SKU + price)
        const normMenu = menuArr.map((m: any) => ({
          ...m,
          sku: String(m?.sku ?? m?.SKU ?? ""),
          name: String(m?.name ?? m?.title ?? ""),
          price: m?.price ?? m?.amount ?? "",
          category: String(m?.category?.name ?? m?.categoryName ?? ""),
        }));
        setMenuItems(normMenu);

        // Normalize bookings
        const normBookings = bookingsArr.map((b: any) => ({
          ...b,
          desk: String(b?.table?.name ?? b?.desk?.name ?? b?.deskId ?? b?.tableId ?? ""),
          start: String(b?.startAt ?? b?.startTime ?? b?.start ?? b?.from ?? ""),
          end: String(b?.endAt ?? b?.endTime ?? b?.end ?? b?.to ?? ""),
          status: String(b?.status ?? ""),
          customer: String(b?.customerName ?? b?.customer ?? b?.userEmail ?? ""),
        }));
        setBookings(normBookings);

        // Normalize orders (revenue-ish)
        const normOrders = ordersArr.map((o: any) => ({
          ...o,
          desk: String(o?.table?.name ?? o?.desk?.name ?? o?.tableId ?? o?.deskId ?? ""),
          total: o?.total ?? o?.amount ?? o?.sum ?? "",
          created: String(o?.createdAt ?? o?.created ?? ""),
        }));
        setOrders(normOrders);

        // Revenue daily
        setRevenueDaily(revenueArr);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Failed to load dashboard");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const kpis = useMemo(() => {
    const totalOrders = orders.length;
    const totalBookings = bookings.length;
    const totalDesks = desks.length;

    const orderSum = orders.reduce((acc, o) => {
      const v = Number(o?.total);
      return Number.isFinite(v) ? acc + v : acc;
    }, 0);

    return { totalOrders, totalBookings, totalDesks, orderSum };
  }, [orders, bookings, desks]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-sm text-gray-600">
        Loading owner dashboard…
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="max-w-xl w-full rounded border bg-white p-4">
          <div className="font-semibold mb-2">Dashboard error</div>
          <div className="text-sm text-red-700 break-words">{err}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-bold">Dashboard</div>
        <div className="text-sm text-gray-600">
          Desks: {kpis.totalDesks} • Bookings: {kpis.totalBookings} • Orders: {kpis.totalOrders} • Revenue (orders): {money(kpis.orderSum)}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Desk List">
          <Table
            empty="No desks."
            cols={[
              { k: "name", label: "Desk" },
              { k: "laptopSerial", label: "Laptop Serial" },
              { k: "hourlyRate", label: "Rate" },
              { k: "qrUrl", label: "QR URL" },
            ]}
            rows={desks}
          />
        </Section>

        <Section title="Menu Items & SKUs">
          <Table
            empty="No menu items."
            cols={[
              { k: "sku", label: "SKU" },
              { k: "name", label: "Item" },
              { k: "price", label: "Price" },
              { k: "category", label: "Category" },
            ]}
            rows={menuItems}
          />
        </Section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Bookings">
          <Table
            empty="No bookings."
            cols={[
              { k: "desk", label: "Desk" },
              { k: "customer", label: "Customer" },
              { k: "start", label: "Start" },
              { k: "end", label: "End" },
              { k: "status", label: "Status" },
            ]}
            rows={bookings.slice(0, 30)}
          />
        </Section>

        <Section title="Orders">
          <Table
            empty="No orders."
            cols={[
              { k: "desk", label: "Desk" },
              { k: "total", label: "Total" },
              { k: "created", label: "Created" },
            ]}
            rows={orders.slice(0, 30)}
          />
        </Section>
      </div>

      <Section title="Revenue Daily (analytics/revenue/daily)">
        {revenueDaily.length ? (
          <pre className="text-xs bg-white border rounded p-3 overflow-auto">
            {JSON.stringify(revenueDaily, null, 2)}
          </pre>
        ) : (
          <div className="text-sm text-gray-600">No daily revenue payload available.</div>
        )}
      </Section>
    </div>
  );
}
