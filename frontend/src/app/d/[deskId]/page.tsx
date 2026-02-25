"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import QRCode from "react-qr-code";
import { apiFetch } from "@/lib/api";

type MenuItem = { id: string; name: string; sku: string; price: number };

function normSku(s: string) {
  return String(s || "").toUpperCase();
}

export default function DeskGuestPage() {
  const params = useParams<{ deskId: string }>();
  const deskId = String(params?.deskId || "");
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [deskName, setDeskName] = useState<string>("Desk");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");

  // only needed if EXTRA_HOUR is ordered
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [busy, setBusy] = useState(false);
  const handledAddRef = useRef<string>("");

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const res = await apiFetch(`/public?deskId=${encodeURIComponent(deskId)}`, { method: "GET" });
      setDeskName(String(res?.desk?.name || "Desk"));

      const mi = Array.isArray(res?.menuItems) ? res.menuItems : [];
      setMenuItems(
        mi.map((x: any) => ({
          id: String(x?.id),
          name: String(x?.name || ""),
          sku: String(x?.sku || ""),
          price: Number(x?.price || 0),
        }))
      );
    } catch (e: any) {
      setErr(e?.message || "Failed to load desk/menu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (deskId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deskId]);

  // Auto-add from item QR: /d/<deskId>?add=<itemId>
  useEffect(() => {
    if (!menuItems.length) return;
    if (typeof window === "undefined") return;

    const add = new URLSearchParams(window.location.search).get("add") || "";
    if (!add) return;
    if (handledAddRef.current === add) return;

    const exists = menuItems.find((x) => x.id === add);
    if (!exists) return;

    handledAddRef.current = add;
    setCart((c) => ({ ...c, [add]: (c[add] || 0) + 1 }));
  }, [menuItems]);

  function addItem(id: string) {
    setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  }
  function removeItem(id: string) {
    setCart((c) => {
      const next = { ...c };
      const q = (next[id] || 0) - 1;
      if (q <= 0) delete next[id];
      else next[id] = q;
      return next;
    });
  }

  const cartLines = useMemo(() => {
    const byId = new Map(menuItems.map((m) => [m.id, m]));
    return Object.entries(cart)
      .map(([id, qty]) => {
        const item = byId.get(id);
        if (!item) return null;
        return { id, qty, item, total: item.price * qty };
      })
      .filter(Boolean) as Array<{ id: string; qty: number; item: MenuItem; total: number }>;
  }, [cart, menuItems]);

  const hasExtraHour = useMemo(
    () => cartLines.some((l) => normSku(l.item.sku) === "EXTRA_HOUR"),
    [cartLines]
  );

  const total = useMemo(() => cartLines.reduce((a, l) => a + l.total, 0), [cartLines]);

  async function placeOrder() {
    setErr(null);
    if (!cartLines.length) return setErr("Cart is empty.");

    if (hasExtraHour) {
      if (!customerName.trim() || !customerPhone.trim()) {
        return setErr("Customer name and phone are required for Extend time.");
      }
    }

    setBusy(true);
    try {
      await apiFetch("/public/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: deskId,
          notes: note || "",
          paymentMethod: "CASH",
          paymentStatus: "PENDING",
          customerName: hasExtraHour ? customerName.trim() : undefined,
          customerPhone: hasExtraHour ? customerPhone.trim() : undefined,
          items: cartLines.map((l) => ({ menuItemId: l.item.id, quantity: l.qty })),
        }),
      });

      setCart({});
      setNote("");
      setCustomerName("");
      setCustomerPhone("");
      alert("Order sent to receptionist (cash pending).");
    } catch (e: any) {
      setErr(e?.message || "Order failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="p-6 text-sm text-gray-600">Loading desk…</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-4">
      {err && <div className="rounded border bg-red-50 p-3 text-sm text-red-800 border-red-200">{err}</div>}

      <div className="rounded border bg-white p-4">
        <div className="text-2xl font-bold">{deskName}</div>
        <div className="text-sm text-gray-600">Desk ID: {deskId}</div>
      </div>

      {hasExtraHour && (
        <div className="rounded border bg-white p-4 grid gap-3 md:grid-cols-2">
          <label className="block text-sm">
            Customer name (required for Extend time)
            <input className="mt-1 w-full rounded border p-2" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          </label>
          <label className="block text-sm">
            Customer phone (required for Extend time)
            <input className="mt-1 w-full rounded border p-2" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
          </label>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded border bg-white p-4">
          <div className="font-semibold mb-3">Menu</div>
          <div className="space-y-3">
            {menuItems.map((m) => {
              const itemQr = `${origin}/d/${encodeURIComponent(deskId)}?add=${encodeURIComponent(m.id)}`;
              return (
                <div key={m.id} className="rounded border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">{m.name}</div>
                      <div className="text-xs text-gray-500">SKU: {m.sku}</div>
                      <div className="text-sm mt-1">{m.price} EGP</div>
                      <button className="mt-2 rounded border px-2 py-1 text-sm hover:bg-gray-50" onClick={() => addItem(m.id)} type="button">
                        Add
                      </button>
                    </div>

                    <div className="text-center">
                      <div className="rounded bg-gray-50 p-2 inline-block">
                        <QRCode value={itemQr} size={84} />
                      </div>
                      <div className="text-[10px] text-gray-500 mt-1">Scan to add</div>
                    </div>
                  </div>
                </div>
              );
            })}
            {!menuItems.length && <div className="text-sm text-gray-600">No menu items found.</div>}
          </div>
        </div>

        <div className="rounded border bg-white p-4 space-y-3">
          <div className="font-semibold">Your Order</div>

          {cartLines.length ? (
            <div className="space-y-2">
              {cartLines.map((l) => (
                <div key={l.id} className="flex items-center justify-between">
                  <div className="text-sm">
                    {l.item.name} × {l.qty}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm">{l.total} EGP</div>
                    <button className="rounded border px-2 py-1 text-sm hover:bg-gray-50" onClick={() => removeItem(l.id)} type="button">-</button>
                    <button className="rounded border px-2 py-1 text-sm hover:bg-gray-50" onClick={() => addItem(l.id)} type="button">+</button>
                  </div>
                </div>
              ))}
              <div className="border-t pt-2 text-sm font-semibold">Total: {total} EGP</div>
            </div>
          ) : (
            <div className="text-sm text-gray-600">Cart is empty.</div>
          )}

          <label className="block text-sm">
            Notes (optional)
            <input className="mt-1 w-full rounded border p-2" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>

          <button className="rounded bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-60" disabled={busy} onClick={placeOrder} type="button">
            {busy ? "Sending…" : "Place Order (Cash Pending)"}
          </button>
        </div>
      </div>
    </div>
  );
}
