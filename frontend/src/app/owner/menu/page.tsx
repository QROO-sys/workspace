"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { apiFetch } from "@/lib/api";

type Category = { id: string; name: string };
type Item = { id: string; name: string; sku: string; price: number; categoryId?: string };
type Desk = { id: string; name: string };

function money(n: any) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(v);
}

export default function OwnerMenuPage() {
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [desks, setDesks] = useState<Desk[]>([]);
  const [deskId, setDeskId] = useState<string>("");

  const [activeCatId, setActiveCatId] = useState<string>("ALL");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [note, setNote] = useState<string>("");

  // Only needed if cart includes EXTRA_HOUR
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");

  const [busy, setBusy] = useState(false);

  const handledAddRef = useRef<string>("");

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const [catRes, itemRes, deskRes] = await Promise.all([
        apiFetch("/menu-categories", { method: "GET" }).catch(() => []),
        apiFetch("/menu-items", { method: "GET" }),
        apiFetch("/desks", { method: "GET" }),
      ]);

      const catArr = Array.isArray(catRes) ? catRes : (catRes as any)?.categories || [];
      const itemArr = Array.isArray(itemRes) ? itemRes : (itemRes as any)?.menuItems || (itemRes as any)?.items || [];
      const deskArr = Array.isArray(deskRes) ? deskRes : (deskRes as any)?.desks || [];

      const normCats: Category[] = (catArr as any[])
        .map((c: any) => ({ id: String(c?.id ?? ""), name: String(c?.name ?? "") }))
        .filter((c: Category) => Boolean(c.id && c.name));

      const normItems: Item[] = (itemArr as any[])
        .map((m: any) => ({
          id: String(m?.id ?? ""),
          name: String(m?.name ?? ""),
          sku: String(m?.sku ?? ""),
          price: Number(m?.price ?? 0),
          categoryId: String(m?.categoryId ?? m?.category?.id ?? ""),
        }))
        .filter((i: Item) => Boolean(i.id && i.name));

      const normDesks: Desk[] = (deskArr as any[])
        .map((d: any, idx: number) => ({ id: String(d?.id ?? ""), name: String(d?.name ?? `Desk ${idx + 1}`) }))
        .filter((d: Desk) => Boolean(d.id));

      setCategories(normCats);
      setItems(normItems);
      setDesks(normDesks);
      if (!deskId && normDesks.length) setDeskId(normDesks[0].id);
    } catch (e: any) {
      setErr(e?.message || "Failed to load menu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-add item from QR: /owner/menu?add=<itemId>
  useEffect(() => {
    if (!items.length) return;
    if (typeof window === "undefined") return;

    const add = new URLSearchParams(window.location.search).get("add") || "";
    if (!add) return;
    if (handledAddRef.current === add) return;

    const exists = items.find((x) => x.id === add);
    if (!exists) return;

    handledAddRef.current = add;
    setCart((c) => ({ ...c, [add]: (c[add] || 0) + 1 }));
  }, [items]);

  const filteredItems = useMemo(() => {
    if (activeCatId === "ALL") return items;
    return items.filter((i) => i.categoryId === activeCatId);
  }, [items, activeCatId]);

  const cartLines = useMemo(() => {
    const byId = new Map(items.map((i) => [i.id, i]));
    return Object.entries(cart)
      .map(([id, qty]) => {
        const item = byId.get(id);
        if (!item) return null;
        return { item, qty, total: item.price * qty };
      })
      .filter(Boolean) as Array<{ item: Item; qty: number; total: number }>;
  }, [cart, items]);

  const cartTotal = useMemo(() => cartLines.reduce((a, l) => a + l.total, 0), [cartLines]);

  const hasExtraHour = useMemo(
    () => cartLines.some((l) => String(l.item.sku || "").toUpperCase() === "EXTRA_HOUR"),
    [cartLines]
  );

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

  async function submitOrder() {
    setErr(null);

    if (!deskId) return setErr("Select a desk first.");
    if (!cartLines.length) return setErr("Cart is empty.");

    // ✅ only require customer details if EXTEND TIME is included
    if (hasExtraHour) {
      if (!customerName.trim() || !customerPhone.trim()) {
        return setErr("Customer name and phone are required for Extend time.");
      }
    }

    setBusy(true);
    try {
      await apiFetch("/orders", {
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
      alert("Order created.");
    } catch (e: any) {
      setErr(e?.message || "Order failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="text-sm text-gray-600">Loading menu…</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-2xl font-bold">Menu</div>
          <div className="text-sm text-gray-600">Click tiles or scan item QRs to add to cart.</div>
        </div>
        <button className="rounded border px-3 py-2 text-sm hover:bg-gray-50" onClick={load} type="button">
          Refresh
        </button>
      </div>

      {err && (
        <div className="rounded border bg-red-50 p-3 text-sm text-red-800 border-red-200">{err}</div>
      )}

      <div className="rounded border bg-white p-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-sm">
            Desk (required)
            <select className="mt-1 w-full rounded border p-2" value={deskId} onChange={(e) => setDeskId(e.target.value)}>
              {desks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            Notes (optional)
            <input className="mt-1 w-full rounded border p-2" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
        </div>

        {hasExtraHour && (
          <div className="grid gap-3 md:grid-cols-2">
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
      </div>

      {/* Categories */}
      <div className="space-y-2">
        <div className="text-sm font-semibold">Categories</div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveCatId("ALL")}
            className={"rounded border px-3 py-2 text-sm " + (activeCatId === "ALL" ? "bg-gray-900 text-white" : "hover:bg-gray-50")}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCatId(c.id)}
              className={"rounded border px-3 py-2 text-sm " + (activeCatId === c.id ? "bg-gray-900 text-white" : "hover:bg-gray-50")}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Items with QR */}
      <div className="space-y-2">
        <div className="text-sm font-semibold">Items</div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((i) => {
            const qrValue = `${origin}/owner/menu?add=${encodeURIComponent(i.id)}`;
            return (
              <div key={i.id} className="rounded border bg-white p-4">
                <button type="button" className="w-full text-left hover:opacity-90" onClick={() => addItem(i.id)}>
                  <div className="font-semibold">{i.name}</div>
                  <div className="text-xs text-gray-600 mt-1">SKU: {i.sku}</div>
                  <div className="text-sm mt-2">{money(i.price)} EGP</div>
                  <div className="text-xs text-gray-500 mt-1">Click to add</div>
                </button>

                <div className="mt-3 flex items-center gap-3">
                  <div className="rounded bg-gray-50 p-2">
                    <QRCode value={qrValue} size={80} />
                  </div>
                  <div className="text-xs text-gray-600 break-all">
                    QR: <span className="font-mono">{qrValue}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {!filteredItems.length && <div className="text-sm text-gray-600">No items for this category.</div>}
        </div>
      </div>

      {/* Cart */}
      <div className="rounded border bg-white p-4 space-y-2">
        <div className="font-semibold">Cart</div>

        {cartLines.length ? (
          <div className="space-y-2">
            {cartLines.map((l) => (
              <div key={l.item.id} className="flex items-center justify-between">
                <div className="text-sm">
                  {l.item.name} × {l.qty}
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm">{money(l.total)} EGP</div>
                  <button className="rounded border px-2 py-1 text-sm hover:bg-gray-50" type="button" onClick={() => removeItem(l.item.id)}>
                    -
                  </button>
                  <button className="rounded border px-2 py-1 text-sm hover:bg-gray-50" type="button" onClick={() => addItem(l.item.id)}>
                    +
                  </button>
                </div>
              </div>
            ))}
            <div className="border-t pt-2 text-sm font-semibold">Total: {money(cartTotal)} EGP</div>
          </div>
        ) : (
          <div className="text-sm text-gray-600">Cart is empty.</div>
        )}

        <button className="rounded bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-60" disabled={busy} onClick={submitOrder} type="button">
          {busy ? "Submitting…" : "Create Order (Cash Pending)"}
        </button>
      </div>
    </div>
  );
}
