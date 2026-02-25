k'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';

type DeskLike = {
  id: string;
  name?: string | null;
};

type MenuItem = {
  id: string;
  name: string;
  sku?: string | null;
  // backend schema varies; we only display if present
  price?: number | null;
  priceEgp?: number | null;
  priceEGP?: number | null;
  unitPrice?: number | null;
};

function priceOf(mi: any) {
  return (
    mi?.priceEgp ??
    mi?.priceEGP ??
    mi?.unitPrice ??
    mi?.price ??
    null
  );
}

export default function OwnerMenuPage() {
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Toggle: counter order means NOT tied to desk/table
  const [counterOrder, setCounterOrder] = useState<boolean>(true);

  // For desk/table orders (optional)
  const [selectedDeskId, setSelectedDeskId] = useState<string>('');

  const [desks, setDesks] = useState<DeskLike[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  // Simple cart: menuItemId -> quantity
  const [cart, setCart] = useState<Record<string, number>>({});

  // Load desks + menu items (best-effort endpoints)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setErr(null);
      try {
        // Try common endpoints; your project already has owner desks + menu pages
        const [desksRes, menuRes] = await Promise.allSettled([
          apiFetch('/desks', { method: 'GET' }),
          apiFetch('/menu-items', { method: 'GET' }),
        ]);

        if (!cancelled) {
          if (desksRes.status === 'fulfilled' && Array.isArray(desksRes.value)) {
            setDesks(desksRes.value);
          } else {
            // fallback: some projects use /tables; keep as fallback to allow selection if needed
            const tables = await apiFetch('/tables', { method: 'GET' }).catch(() => []);
            if (Array.isArray(tables)) setDesks(tables);
          }

          if (menuRes.status === 'fulfilled' && Array.isArray(menuRes.value)) {
            setMenuItems(menuRes.value);
          } else {
            // fallback: some projects use /menu
            const menu = await apiFetch('/menu', { method: 'GET' }).catch(() => []);
            if (Array.isArray(menu)) setMenuItems(menu);
          }
        }
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || 'Failed to load menu/desks');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const cartLines = useMemo(() => {
    const byId = new Map(menuItems.map((m) => [m.id, m]));
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => ({ item: byId.get(id), id, qty }));
  }, [cart, menuItems]);

  const totalEstimate = useMemo(() => {
    // backend computes authoritative total, but we show an estimate if prices exist
    let total = 0;
    for (const line of cartLines) {
      const p = priceOf(line.item);
      if (typeof p === 'number') total += p * line.qty;
    }
    return total;
  }, [cartLines]);

  function inc(id: string) {
    setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  }

  function dec(id: string) {
    setCart((prev) => {
      const cur = prev[id] || 0;
      const next = Math.max(0, cur - 1);
      return { ...prev, [id]: next };
    });
  }

  function clearCart() {
    setCart({});
  }

  async function checkout() {
    setErr(null);
    setOkMsg(null);

    const items = cartLines.map((l) => ({
      menuItemId: l.id,
      // IMPORTANT: backend expects quantity (not qty); it will also accept qty but we send quantity to be safe
      quantity: l.qty,
    }));

    if (items.length === 0) {
      setErr('Cart is empty.');
      return;
    }

    // If not counter order, require desk/table selection
    if (!counterOrder && !selectedDeskId) {
      setErr('Select a desk/table or switch to Counter Order.');
      return;
    }

    setBusy(true);
    try {
      const payload: any = {
        counterOrder: !!counterOrder,
        items,
      };

      // When NOT counter order, attach desk/table id.
      // Your backend supports both tableId and deskId; your tenant seems table-based, so we send tableId.
      if (!counterOrder) {
        payload.tableId = selectedDeskId;
      }

      // Staff should NOT need laptop agreement; backend skips for OWNER/ADMIN/EMPLOYEE.

      const created = await apiFetch('/orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setOkMsg(`Order created: ${created?.order?.id || 'OK'}`);
      clearCart();
    } catch (e: any) {
      setErr(e?.message || 'Order could not be created');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ marginTop: 0 }}>Menu Orders</h1>

      {err && (
        <div style={{ border: '1px solid #f2c2c2', background: '#fff5f5', padding: 12, borderRadius: 10, marginBottom: 12 }}>
          <b>Error:</b> {err}
        </div>
      )}
      {okMsg && (
        <div style={{ border: '1px solid #bfe3bf', background: '#f4fff4', padding: 12, borderRadius: 10, marginBottom: 12 }}>
          {okMsg}
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={counterOrder}
            onChange={(e) => setCounterOrder(e.target.checked)}
          />
          Counter Order (no desk/table)
        </label>

        {!counterOrder && (
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            Desk/Table:
            <select
              value={selectedDeskId}
              onChange={(e) => setSelectedDeskId(e.target.value)}
              style={{ padding: 8 }}
            >
              <option value="">Select…</option>
              {desks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name || d.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        {/* Menu */}
        <div>
          <h2 style={{ marginTop: 0 }}>Items</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {menuItems.map((mi) => (
              <div key={mi.id} style={{ border: '1px solid #eee', padding: 12, borderRadius: 12 }}>
                <div style={{ fontWeight: 700 }}>{mi.name}</div>
                <div style={{ opacity: 0.7 }}>{mi.sku || ''}</div>
                <div style={{ marginTop: 8 }}>
                  {typeof priceOf(mi) === 'number' ? `${priceOf(mi)} EGP` : <span style={{ opacity: 0.6 }}>Price</span>}
                </div>
                <button onClick={() => inc(mi.id)} style={{ marginTop: 10, padding: '8px 12px' }}>
                  Add
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Cart */}
        <div>
          <h2 style={{ marginTop: 0 }}>Cart</h2>

          {cartLines.length === 0 ? (
            <div style={{ opacity: 0.7 }}>No items yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {cartLines.map((l) => (
                <div key={l.id} style={{ border: '1px solid #eee', padding: 10, borderRadius: 12 }}>
                  <div style={{ fontWeight: 700 }}>{l.item?.name || l.id}</div>
                  <div style={{ opacity: 0.75 }}>{l.item?.sku || ''}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                    <button onClick={() => dec(l.id)} style={{ padding: '6px 10px' }}>
                      -
                    </button>
                    <div style={{ minWidth: 30, textAlign: 'center' }}>{l.qty}</div>
                    <button onClick={() => inc(l.id)} style={{ padding: '6px 10px' }}>
                      +
                    </button>
                  </div>
                </div>
              ))}

              <div style={{ borderTop: '1px solid #eee', paddingTop: 10 }}>
                <div style={{ fontWeight: 800 }}>Estimate: {totalEstimate} EGP</div>
                <div style={{ opacity: 0.7, marginTop: 4 }}>
                  Backend calculates final total.
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={checkout} disabled={busy} style={{ padding: '10px 14px' }}>
                  {busy ? 'Creating…' : 'Checkout'}
                </button>
                <button onClick={clearCart} disabled={busy} style={{ padding: '10px 14px' }}>
                  Clear
                </button>
              </div>

              {!counterOrder && (
                <div style={{ marginTop: 6, opacity: 0.75 }}>
                  Desk/Table orders will be attached to the selected desk/table.
                </div>
              )}

              {counterOrder && (
                <div style={{ marginTop: 6, opacity: 0.75 }}>
                  Counter orders are not tied to any desk/table. EXTRA_HOUR will be blocked.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
