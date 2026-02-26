'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';

type Desk = { id: string; name?: string | null };
type Category = { id: string; name: string };
type MenuItem = {
  id: string;
  name: string;
  sku: string;
  price: number;
  categoryId?: string | null;
  deleted?: boolean;
};

const APP_BASE = process.env.NEXT_PUBLIC_APP_BASE_URL || 'https://app.qr-oo.com';

function qrImgUrl(data: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(data)}`;
}

function money(n: any) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '';
  return `${v} EGP`;
}

export default function ResourcesPage() {
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [desks, setDesks] = useState<Desk[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);

  // receptionist cart: menuItemId -> quantity
  const [cart, setCart] = useState<Record<string, number>>({});

  // desk creation
  const [newDeskName, setNewDeskName] = useState('');

  // SKU creation/editing
  const [newName, setNewName] = useState('');
  const [newSku, setNewSku] = useState('');
  const [newPrice, setNewPrice] = useState<number>(0);
  const [newCategoryId, setNewCategoryId] = useState<string>('');

  const [editId, setEditId] = useState<string>('');
  const [editName, setEditName] = useState('');
  const [editSku, setEditSku] = useState('');
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editCategoryId, setEditCategoryId] = useState<string>('');

  async function loadAll() {
    setErr(null);
    try {
      // desks (fallback tables)
      const d = await apiFetch('/desks', { method: 'GET' }).catch(async () => await apiFetch('/tables', { method: 'GET' }));
      setDesks(Array.isArray(d) ? d : []);

      // categories
      const c = await apiFetch('/menu-categories', { method: 'GET' }).catch(async () => await apiFetch('/categories', { method: 'GET' }));
      setCategories(Array.isArray(c) ? c : []);
      if (!newCategoryId && Array.isArray(c) && c[0]?.id) setNewCategoryId(c[0].id);

      // menu items (SKUs)
      const m = await apiFetch('/menu-items', { method: 'GET' });
      setItems(Array.isArray(m) ? m.filter((x: any) => !x?.deleted) : []);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load resources');
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const cartLines = useMemo(() => {
    return Object.entries(cart)
      .filter(([, q]) => q > 0)
      .map(([id, quantity]) => ({ item: itemById.get(id), id, quantity }))
      .filter((x) => !!x.item);
  }, [cart, itemById]);

  const totalEstimate = useMemo(() => {
    return cartLines.reduce((sum, l) => sum + Number(l.item?.price || 0) * l.quantity, 0);
  }, [cartLines]);

  function addToCart(id: string, qty = 1) {
    setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + qty }));
  }

  function removeFromCart(id: string) {
    setCart((prev) => {
      const cur = prev[id] || 0;
      return { ...prev, [id]: Math.max(0, cur - 1) };
    });
  }

  function clearCart() {
    setCart({});
  }

  async function checkoutCounterOrder() {
    setErr(null);
    setOk(null);

    if (cartLines.length === 0) return setErr('Cart is empty.');

    setBusy(true);
    try {
      const payload = {
        counterOrder: true,
        items: cartLines.map((l) => ({ menuItemId: l.id, quantity: l.quantity })),
      };

      const res = await apiFetch('/orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setOk(`Order created: ${res?.order?.id || 'OK'}`);
      clearCart();
    } catch (e: any) {
      setErr(e?.message || 'Order could not be created');
    } finally {
      setBusy(false);
    }
  }

  async function addDesk() {
    setErr(null);
    setOk(null);
    const name = newDeskName.trim();
    if (name.length < 2) return setErr('Desk resource name is required.');

    setBusy(true);
    try {
      await apiFetch('/desks', { method: 'POST', body: JSON.stringify({ name }) }).catch(async () => {
        await apiFetch('/tables', { method: 'POST', body: JSON.stringify({ name }) });
      });
      setNewDeskName('');
      setOk('Desk resource added.');
      await loadAll();
    } catch (e: any) {
      setErr(e?.message || 'Failed to add desk');
    } finally {
      setBusy(false);
    }
  }

  async function deleteDesk(id: string) {
    if (!confirm('Remove this desk resource?')) return;
    setErr(null);
    setOk(null);

    setBusy(true);
    try {
      await apiFetch(`/desks/${id}`, { method: 'DELETE' }).catch(async () => {
        await apiFetch(`/tables/${id}`, { method: 'DELETE' });
      });
      setOk('Desk removed.');
      await loadAll();
    } catch (e: any) {
      setErr(e?.message || 'Failed to remove desk');
    } finally {
      setBusy(false);
    }
  }

  async function createSku() {
    setErr(null);
    setOk(null);

    const name = newName.trim();
    const sku = newSku.trim().toUpperCase();
    const price = Number(newPrice);

    if (name.length < 2) return setErr('Name is required.');
    if (!sku) return setErr('SKU is required.');
    if (!Number.isFinite(price) || price < 0) return setErr('Price must be a number >= 0');
    if (!newCategoryId) return setErr('Category is required.');

    setBusy(true);
    try {
      await apiFetch('/menu-items', {
        method: 'POST',
        body: JSON.stringify({ name, sku, price, categoryId: newCategoryId }),
      });
      setNewName('');
      setNewSku('');
      setNewPrice(0);
      setOk('SKU resource created.');
      await loadAll();
    } catch (e: any) {
      setErr(e?.message || 'Failed to create SKU');
    } finally {
      setBusy(false);
    }
  }

  function startEdit(i: MenuItem) {
    setEditId(i.id);
    setEditName(i.name);
    setEditSku(i.sku);
    setEditPrice(Number(i.price || 0));
    setEditCategoryId(String(i.categoryId || ''));
  }

  async function saveEdit() {
    setErr(null);
    setOk(null);

    if (!editId) return;
    const name = editName.trim();
    const sku = editSku.trim().toUpperCase();
    const price = Number(editPrice);

    if (name.length < 2) return setErr('Name is required.');
    if (!sku) return setErr('SKU is required.');
    if (!Number.isFinite(price) || price < 0) return setErr('Price must be a number >= 0');

    setBusy(true);
    try {
      await apiFetch(`/menu-items/${editId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          sku,
          price,
          categoryId: editCategoryId || undefined,
        }),
      });
      setOk('SKU updated.');
      setEditId('');
      await loadAll();
    } catch (e: any) {
      setErr(e?.message || 'Failed to update SKU');
    } finally {
      setBusy(false);
    }
  }

  async function deleteSku(id: string) {
    if (!confirm('Remove this SKU resource?')) return;
    setErr(null);
    setOk(null);

    setBusy(true);
    try {
      await apiFetch(`/menu-items/${id}`, { method: 'DELETE' });
      setOk('SKU removed.');
      await loadAll();
    } catch (e: any) {
      setErr(e?.message || 'Failed to remove SKU');
    } finally {
      setBusy(false);
    }
  }

  function promptQtyAndAdd(i: MenuItem) {
    const sku = (i.sku || '').toUpperCase();

    // Special case: PRINT asks quantity (sheets)
    if (sku === 'PRINT') {
      const v = prompt('How many sheets?', '10');
      const q = Math.max(1, Math.floor(Number(v || 1)));
      addToCart(i.id, q);
      return;
    }

    addToCart(i.id, 1);
  }

  return (
    <div style={{ padding: 16, maxWidth: 1300, margin: '0 auto' }}>
      <h1 style={{ marginTop: 0 }}>Resources</h1>

      {err && (
        <div style={{ border: '1px solid #f2c2c2', background: '#fff5f5', padding: 12, borderRadius: 10, marginBottom: 12 }}>
          <b>Error:</b> {err}
        </div>
      )}
      {ok && (
        <div style={{ border: '1px solid #bfe3bf', background: '#f4fff4', padding: 12, borderRadius: 10, marginBottom: 12 }}>
          {ok}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        {/* LEFT: tiles + management */}
        <div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
            <button onClick={loadAll} disabled={busy} style={{ padding: '10px 14px' }}>Refresh</button>
            <div style={{ opacity: 0.75, alignSelf: 'center' }}>Desk + SKU tiles (QR-led)</div>
          </div>

          {/* Add Desk */}
          <div style={{ border: '1px solid #eee', borderRadius: 14, padding: 14, marginBottom: 14 }}>
            <h2 style={{ marginTop: 0 }}>Add Desk Resource</h2>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input value={newDeskName} onChange={(e) => setNewDeskName(e.target.value)} placeholder="Desk name" style={{ padding: 10, minWidth: 260 }} />
              <button onClick={addDesk} disabled={busy} style={{ padding: '10px 14px' }}>Add Desk</button>
            </div>
          </div>

          {/* Add SKU */}
          <div style={{ border: '1px solid #eee', borderRadius: 14, padding: 14, marginBottom: 14 }}>
            <h2 style={{ marginTop: 0 }}>Add SKU Resource</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name" style={{ padding: 10 }} />
              <input value={newSku} onChange={(e) => setNewSku(e.target.value)} placeholder="SKU (e.g. PRINT)" style={{ padding: 10 }} />
              <input value={String(newPrice)} onChange={(e) => setNewPrice(Number(e.target.value))} placeholder="Price" style={{ padding: 10 }} />
              <select value={newCategoryId} onChange={(e) => setNewCategoryId(e.target.value)} style={{ padding: 10 }}>
                <option value="">Select category…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <button onClick={createSku} disabled={busy} style={{ marginTop: 10, padding: '10px 14px' }}>Create SKU</button>
          </div>

          {/* Edit SKU */}
          {editId && (
            <div style={{ border: '1px solid #ddd', borderRadius: 14, padding: 14, marginBottom: 14 }}>
              <h2 style={{ marginTop: 0 }}>Edit SKU</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} style={{ padding: 10 }} />
                <input value={editSku} onChange={(e) => setEditSku(e.target.value)} style={{ padding: 10 }} />
                <input value={String(editPrice)} onChange={(e) => setEditPrice(Number(e.target.value))} style={{ padding: 10 }} />
                <select value={editCategoryId} onChange={(e) => setEditCategoryId(e.target.value)} style={{ padding: 10 }}>
                  <option value="">(keep)</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button onClick={saveEdit} disabled={busy} style={{ padding: '10px 14px' }}>Save</button>
                <button onClick={() => setEditId('')} disabled={busy} style={{ padding: '10px 14px' }}>Cancel</button>
              </div>
            </div>
          )}

          {/* Tiles */}
          <h2>Desk Resources</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginBottom: 18 }}>
            {desks.map((d) => (
              <div key={d.id} style={{ border: '1px solid #eee', borderRadius: 14, padding: 14 }}>
                <div style={{ fontWeight: 800 }}>{d.name || `Resource ${d.id.slice(0, 6)}`}</div>
                <div style={{ opacity: 0.75 }}>Desk Resource</div>
                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center' }}>
                  <img src={qrImgUrl(`${APP_BASE}/q/desk/${d.id}`)} alt="QR" width={180} height={180} />
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                  <button onClick={() => window.open(qrImgUrl(`${APP_BASE}/q/desk/${d.id}`), '_blank', 'noopener,noreferrer')} style={{ padding: '10px 12px' }}>Open</button>
                  <button onClick={() => deleteDesk(d.id)} disabled={busy} style={{ padding: '10px 12px' }}>Remove</button>
                </div>
              </div>
            ))}
          </div>

          <h2>SKU Resources</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            {items.map((i) => (
              <div key={i.id} style={{ border: '1px solid #eee', borderRadius: 14, padding: 14 }}>
                <div style={{ fontWeight: 800 }}>{i.name}</div>
                <div style={{ opacity: 0.75 }}>SKU: {i.sku} • {money(i.price)}</div>

                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center' }}>
                  <img src={qrImgUrl(`${APP_BASE}/q/item/${i.id}`)} alt="QR" width={180} height={180} />
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
                  <button onClick={() => promptQtyAndAdd(i)} style={{ padding: '10px 12px' }}>
                    Add to cart
                  </button>
                  <button onClick={() => startEdit(i)} disabled={busy} style={{ padding: '10px 12px' }}>
                    Edit price
                  </button>
                  <button onClick={() => deleteSku(i.id)} disabled={busy} style={{ padding: '10px 12px' }}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: receptionist cart */}
        <div style={{ border: '1px solid #eee', borderRadius: 14, padding: 14, height: 'fit-content' }}>
          <h2 style={{ marginTop: 0 }}>Receptionist Cart</h2>
          {cartLines.length === 0 ? (
            <div style={{ opacity: 0.7 }}>No items yet. Tap SKU tiles to add.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {cartLines.map((l) => (
                <div key={l.id} style={{ border: '1px solid #f2f2f2', borderRadius: 12, padding: 10 }}>
                  <div style={{ fontWeight: 700 }}>{l.item?.name}</div>
                  <div style={{ opacity: 0.75 }}>SKU: {l.item?.sku}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                    <button onClick={() => removeFromCart(l.id)} style={{ padding: '6px 10px' }}>-</button>
                    <div style={{ minWidth: 34, textAlign: 'center' }}>{l.quantity}</div>
                    <button onClick={() => addToCart(l.id, 1)} style={{ padding: '6px 10px' }}>+</button>
                  </div>
                </div>
              ))}

              <div style={{ borderTop: '1px solid #eee', paddingTop: 10 }}>
                <div style={{ fontWeight: 900 }}>Estimate: {totalEstimate} EGP</div>
                <div style={{ opacity: 0.7, marginTop: 4 }}>
                  Checkout creates a deskless counter order.
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={checkoutCounterOrder} disabled={busy} style={{ padding: '10px 14px' }}>
                  {busy ? 'Creating…' : 'Checkout'}
                </button>
                <button onClick={clearCart} disabled={busy} style={{ padding: '10px 14px' }}>
                  Clear
                </button>
              </div>

              <div style={{ marginTop: 6, opacity: 0.75 }}>
                Scenario: Coffee + Print 10 sheets → tap COFFEE, tap PRINT (enter 10), checkout.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
