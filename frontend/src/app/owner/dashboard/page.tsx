"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

type AnyObj = Record<string, any>;

function toArray(x: any): any[] {
  return Array.isArray(x) ? x : Array.isArray(x?.items) ? x.items : Array.isArray(x?.data) ? x.data : Array.isArray(x?.desks) ? x.desks : Array.isArray(x?.bookings) ? x.bookings : Array.isArray(x?.sessions) ? x.sessions : Array.isArray(x?.menu) ? x.menu : Array.isArray(x?.menuItems) ? x.menuItems : [];
}

function fmtMoney(n: any) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(num);
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded border bg-white p-4">
      <div className="font-semibold mb-3">{title}</div>
      {children}
    </div>
  );
}

function SimpleTable({
  columns,
  rows,
  empty,
}: {
  columns: { key: string; label: string }[];
  rows: AnyObj[];
  empty: string;
}) {
  if (!rows.length) return <div className="text-sm text-gray-600">{empty}</div>;

  return (
    <div className="overflow-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            {columns.map((c) => (
              <th key={c.key} className="py-2 pr-4 font-medium">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id || r._id || i} className="border-b last:border-b-0">
              {columns.map((c) => (
                <td key={c.key} className="py-2 pr-4 whitespace-nowrap">
                  {String(r?.[c.key] ?? "")}
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
  const [sessions, setSessions] = useState<AnyObj[]>([]);
  const [revenue, setRevenue] = useState<AnyObj | null>(null);

  const upcomingBookings = useMemo(() => {
    const now = Date.now();
    return bookings
      .slice()
      .sort((a, b) => Number(new Date(a.startTime || a.start || a.from || 0)) - Number(new Date(b.startTime || b.start || b.from || 0)))
      .filter((b) => {
        const t = Number(new Date(b.startTime || b.start || b.from || 0));
        return Number.isFinite(t) ? t >= now : true;
      })
      .slice(0, 20);
  }, [bookings]);

  useEffect(() => {
    let alive = true;

    async function tryGet(path: string) {
      return await apiFetch(path, { method: "GET" });
    }

    (async () => {
      setErr(null);
      setLoading(true);

      try {
        // 1) Best case: single endpoint returns everything
        // Expected shape examples:
        // { desks:[], menuItems:[], bookings:[], sessions:[], revenue:{...} }
        try {
          const dash = await tryGet("/owner/dashboard");
          const dDesks = toArray(dash?.desks ?? dash?.deskList ?? dash?.data?.desks);
          const dMenu = toArray(dash?.menuItems ?? dash?.menu ?? dash?.data?.menuItems);
          const dBookings = toArray(dash?.bookings ?? dash?.upcomingBookings ?? dash?.data?.bookings);
          const dSessions = toArray(dash?.sessions ?? dash?.activeSessions ?? dash?.data?.sessions);
          const dRevenue = dash?.revenue ?? dash?.stats ?? dash?.data?.revenue ?? null;

          if (alive) {
            setDesks(dDesks);
            setMenuItems(dMenu);
            setBookings(dBookings);
            setSessions(dSessions);
            setRevenue(dRevenue);
          }
          // If this worked, we’re done.
          if (dDesks.length || dMenu.length || dBookings.length || dSessions.length || dRevenue) {
            return;
          }
        } catch {
          // ignore, fall back to multiple endpoints
        }

        // 2) Fallback: multiple endpoints (common patterns)
        const endpoints = {
          desks: ["/owner/desks", "/desks", "/public/desks"],
          menu: ["/owner/menu", "/owner/menu-items", "/menu", "/menu/items"],
          bookings: ["/owner/bookings", "/bookings", "/owner/booking", "/booking"],
          sessions: ["/owner/sessions", "/sessions", "/owner/session", "/session"],
          revenue: ["/owner/revenue", "/owner/stats", "/revenue", "/stats"],
        };

        const results: AnyObj = {};

        // Desks
        for (const ep of endpoints.desks) {
          try {
            const res = await tryGet(ep);
            const arr = Array.isArray(res) ? res : res?.desks;
            if (Array.isArray(arr)) {
              results.desks = arr;
              break;
            }
          } catch {}
        }

        // Menu
        for (const ep of endpoints.menu) {
          try {
            const res = await tryGet(ep);
            const arr = Array.isArray(res) ? res : res?.items ?? res?.menuItems ?? res?.menu;
            if (Array.isArray(arr)) {
              results.menuItems = arr;
              break;
            }
          } catch {}
        }

        // Bookings
        for (const ep of endpoints.bookings) {
          try {
            const res = await tryGet(ep);
            const arr = Array.isArray(res) ? res : res?.bookings ?? res?.items;
            if (Array.isArray(arr)) {
              results.bookings = arr;
              break;
            }
          } catch {}
        }

        // Sessions
        for (const ep of endpoints.sessions) {
          try {
            const res = await tryGet(ep);
            const arr = Array.isArray(res) ? res : res?.sessions ?? res?.items;
            if (Array.isArray(arr)) {
              results.sessions = arr;
              break;
            }
          } catch {}
        }

        // Revenue/stats
        for (const ep of endpoints.revenue) {
          try {
            const res = await tryGet(ep);
            if (res && typeof res === "object") {
              results.revenue = res;
              break;
            }
          } catch {}
        }

        if (!alive) return;

        setDesks(results.desks || []);
        setMenuItems(results.menuItems || []);
        setBookings(results.bookings || []);
        setSessions(results.sessions || []);
        setRevenue(results.revenue || null);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Failed to load dashboard data");
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
        Loading owner dashboard…
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-xl w-full rounded border bg-white p-4">
          <div className="font-semibold mb-2">Owner dashboard error</div>
          <div className="text-sm text-red-700 break-words">{err}</div>
        </div>
      </div>
    );
  }

  // Basic KPIs (best-effort)
  const activeSessions = sessions.length;
  const deskCount = desks.length;
  const upcomingCount = upcomingBookings.length;
  const totalRevenue =
    revenue?.totalRevenue ??
    revenue?.revenue ??
    revenue?.total ??
    revenue?.sum ??
    null;

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col gap-2">
        <div className="text-2xl font-bold">Owner Dashboard</div>
        <div className="text-sm text-gray-600">
          Desks: {deskCount} • Active sessions: {activeSessions} • Upcoming bookings: {upcomingCount}
          {totalRevenue != null ? ` • Revenue: ${fmtMoney(totalRevenue)}` : ""}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Desk List">
          <SimpleTable
            empty="No desks found."
            columns={[
              { key: "name", label: "Desk" },
              { key: "id", label: "ID" },
              { key: "laptopSerial", label: "Laptop Serial" },
              { key: "qrUrl", label: "QR URL" },
            ]}
            rows={desks.map((d: any, i) => ({
              ...d,
              name: String(d?.name ?? `Desk ${i + 1}`),
              laptopSerial: String(d?.laptopSerial ?? d?.serial ?? ""),
              qrUrl: String(d?.qrUrl ?? ""),
            }))}
          />
        </Section>

        <Section title="Menu Items & SKUs">
          <SimpleTable
            empty="No menu items found."
            columns={[
              { key: "sku", label: "SKU" },
              { key: "name", label: "Item" },
              { key: "price", label: "Price" },
            ]}
            rows={menuItems.map((m: any) => ({
              ...m,
              sku: String(m?.sku ?? m?.SKU ?? ""),
              name: String(m?.name ?? m?.title ?? ""),
              price: m?.price ?? m?.amount ?? "",
            }))}
          />
        </Section>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Upcoming Bookings">
          <SimpleTable
            empty="No upcoming bookings."
            columns={[
              { key: "deskId", label: "Desk" },
              { key: "user", label: "User" },
              { key: "start", label: "Start" },
              { key: "end", label: "End" },
            ]}
            rows={upcomingBookings.map((b: any) => ({
              ...b,
              deskId: String(b?.deskId ?? b?.desk?.id ?? ""),
              user: String(b?.userEmail ?? b?.user?.email ?? b?.customer ?? ""),
              start: String(b?.startTime ?? b?.start ?? b?.from ?? ""),
              end: String(b?.endTime ?? b?.end ?? b?.to ?? ""),
            }))}
          />
        </Section>

        <Section title="Active Sessions">
          <SimpleTable
            empty="No active sessions."
            columns={[
              { key: "deskId", label: "Desk" },
              { key: "user", label: "User" },
              { key: "started", label: "Started" },
              { key: "rate", label: "Rate" },
            ]}
            rows={sessions.map((s: any) => ({
              ...s,
              deskId: String(s?.deskId ?? s?.desk?.id ?? ""),
              user: String(s?.userEmail ?? s?.user?.email ?? s?.customer ?? ""),
              started: String(s?.startTime ?? s?.start ?? s?.from ?? ""),
              rate: String(s?.hourlyRate ?? s?.rate ?? ""),
            }))}
          />
        </Section>
      </div>

      <Section title="Revenue / Stats">
        {revenue ? (
          <pre className="text-xs bg-white border rounded p-3 overflow-auto">
            {JSON.stringify(revenue, null, 2)}
          </pre>
        ) : (
          <div className="text-sm text-gray-600">No revenue/stats payload found.</div>
        )}
      </Section>
    </div>
  );
}
