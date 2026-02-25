"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import QRCode from "react-qr-code";
import { apiFetch } from "@/lib/api";

type Desk = { id: string; name: string; laptopSerial?: string; qrUrl?: string };
type MenuItem = { id: string; name: string; sku: string; price: number };
type SessionStartResponse = { ok: boolean; sessionId: string; deskId: string; deskName: string; startAt: string; endAt: string };

export default function DeskGuestPage() {
  const params = useParams<{ deskId: string }>();
  const deskId = String(params?.deskId || "");
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [desk, setDesk] = useState<Desk | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [session, setSession] = useState<SessionStartResponse | null>(null);
  const [starting, setStarting] = useState(false);

  const [cart, setCart] = useState<Record<string, number>>({});
  const [placing, setPlacing] = useState(false);
  const [note, setNote] = useState("");

  const handledAddRef = useRef<string>("");

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const res = await apiFetch(`/public?deskId=${encodeURIComponent(deskId)}`, { method: "GET" });

      const d = res?.desk;
      const mi = Array.isArray(res?.menuItems) ? res.menuItems : [];

      setDesk({
        id: String(d?.id || deskId),
        name: String(d?.name || `Desk ${deskId}`),
        laptopSerial: String(d?.laptopSerial || d?.serial || ""),
        qrUrl: String(d?.qrUrl || ""),
      });

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

  async function startSession() {
    setErr(null);

    if (!policyAccepted) return setErr("You must accept the laptop usage policy to start.");
    if (!name.trim() || !phone.trim()) return setErr("Name and phone are required to start.");

    setStarting(true);
    try {
      const res = (await apiFetch("/public/sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deskId, name: name.trim(), phone: phone.trim(), policyAccepted: true }),
      })) as SessionStartResponse;

      setSession(res);
    } catch (e: any) {
      setErr(e?.message || "Failed to start session");
    } finally {
      setStarting(false);
    }
  }

  function addToCart(id: string) {
    setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  }
  function removeFromCart(id: string) {
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
        return { id, qty, item, lineTotal: item.price * qty };
      })
      .filter(Boolean) as Array<{ id: string; qty: number; item: MenuItem; lineTotal: number }>;
  }, [cart, menuItems]);

  const cartTotal = useMemo(() => cartLines.reduce((a, l) => a + l.lineTotal, 0), [cartLines]);

  const hasExtraHour = useMemo(
    () => cartLines.some((l) => String(l.item.sku || "").toUpperCase() === "EXTRA_HOUR"),
    [cartLines]
  );

  async function placeOrder() {
    setErr(null);

    if (!session?.sessionId) return setErr("Start your desk session before ordering.");
    if (!cartLines.length) return setErr("Cart is empty.");

    // On desk flow, name/phone are already collected for session start.
    // But keep a safety check if EXTRA_HOUR is included:
    if (hasExtraHour && (!name.trim() || !phone.trim())) {
      return setErr("Name and phone are required for Extend time.");
    }

    setPlacing(true);
    try {
      await apiFetch("/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: deskId,
          sessionId: session.sessionId,
          notes: note || "",
          paymentMethod: "CASH",
          paymentStatus: "PENDING",
          customerName: hasExtraHour ? name.trim() : undefined,
          customerPhone: hasExtraHour ? phone.trim() : undefined,
          items: cartLines.map((l) => ({ menuItemId: l.item.id, quantity: l.qty })),
        }),
      });

      setCart({});
      setNote("");
      alert("Order sent to receptionist (pending payment).");
    } catch (e: any) {
      setErr(e?.message || "Failed to place order");
    } finally {
      setPlacing(false);
    }
  }

  if (loading) return <div className="p-6 text-sm text-gray-600">Loading desk…</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      {err && (
        <div className="rounded border bg-red-50 p-3 text-sm text-red-800 border-red-200">{err}</div>
      )}

      <div className="rounded border bg-white p-4">
        <div className="text-2xl font-bold">{desk?.name || "Desk"}</div>
        <div className="text-sm text-gray-600">
          Desk ID: {deskId}
          {desk?.laptopSerial ? ` • Laptop: ${desk.laptopSerial}` : ""}
        </div>
      </div>

      {!session && (
        <div className="rounded border bg-white p-4 space-y-3">
          <div className="font-semibold">Start your session</div>

          <label className="block text-sm">
            Name
            <input className="mt-1 w-full rounded border p-2" value={name} onChange={(e) => setName(e.target.value)} />
          </label>

          <label className="block text-sm">
            Phone
            <input className="mt-1 w-full rounded border p-2" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>

          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={policyAccepted} onChange={(e) => setPolicyAccepted(e.target.checked)} />
            <span>I agree to the laptop usage policy.</span>
          </label>

          <button
            className="rounded bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-60"
            disabled={starting}
            onClick={startSession}
            type="button"
          >
            {starting ? "Starting…" : "Start Session"}
          </button>
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

                      <button
                        className="mt-2 rounded border px-2 py-1 text-sm hover:bg-gray-50"
                        onClick={() => addToCart(m.id)}
                        type="button"
                      >
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
                    <div className="text-sm">{l.lineTotal} EGP</div>
                    <button className="rounded border px-2 py-1 text-sm hover:bg-gray-50" onClick={() => removeFromCart(l.id)} type="button">
                      -
                    </button>
                    <button className="rounded border px-2 py-1 text-sm hover:bg-gray-50" onClick={() => addToCart(l.id)} type="button">
                      +
                    </button>
                  </div>
                </div>
              ))}
              <div className="border-t pt-2 text-sm font-semibold">Total: {cartTotal} EGP</div>
            </div>
          ) : (
            <div className="text-sm text-gray-600">Cart is empty.</div>
          )}

          <label className="block text-sm">
            Notes (optional)
            <input className="mt-1 w-full rounded border p-2" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>

          <button
            className="rounded bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-60"
            disabled={placing}
            onClick={placeOrder}
            type="button"
          >
            {placing ? "Sending…" : "Place Order (Cash Pending)"}
          </button>
        </div>
      </div>
    </div>
  );
}
