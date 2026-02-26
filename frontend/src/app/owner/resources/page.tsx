'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';

type Desk = { id: string; name?: string | null };
type MenuItem = { id: string; name: string; sku?: string | null };

const APP_BASE = process.env.NEXT_PUBLIC_APP_BASE_URL || 'https://app.qr-oo.com';

function qrUrl(data: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(data)}`;
}

function Tile({
  title,
  subtitle,
  qrData,
  onDelete,
}: {
  title: string;
  subtitle?: string;
  qrData: string;
  onDelete?: () => void;
}) {
  const img = qrUrl(qrData);
  return (
    <div style={{ border: '1px solid #eee', borderRadius: 14, padding: 14 }}>
      <div style={{ fontWeight: 800 }}>{title}</div>
      {subtitle && <div style={{ opacity: 0.75, marginTop: 2 }}>{subtitle}</div>}
      <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center' }}>
        <img src={img} alt="QR" width={180} height={180} style={{ borderRadius: 10, border: '1px solid #f2f2f2' }} />
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <button onClick={() => window.open(img, '_blank', 'noopener,noreferrer')} style={{ padding: '10px 12px' }}>
          Open
        </button>
        {onDelete && (
          <button onClick={onDelete} style={{ padding: '10px 12px' }}>
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

export default function ResourcesPage() {
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [tenantId, setTenantId] = useState<string>('');
  const [desks, setDesks] = useState<Desk[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);

  const [newDeskName, setNewDeskName] = useState('');

  async function loadMe() {
    try {
      const me = await apiFetch('/auth/me', { method: 'GET' });
      if (me?.tenantId) setTenantId(me.tenantId);
    } catch {
      // ignore; resources still load, but print QR needs tenant
    }
  }

  async function loadAll() {
    setErr(null);
    try {
      const d = await apiFetch('/desks', { method: 'GET' }).catch(async () => await apiFetch('/tables', { method: 'GET' }));
      setDesks(Array.isArray(d) ? d : []);

      const m = await apiFetch('/menu-items', { method: 'GET' }).catch(async () => await apiFetch('/menu', { method: 'GET' }));
      setItems(Array.isArray(m) ? m : []);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load resources');
    }
  }

  useEffect(() => {
    loadMe();
    loadAll();
  }, []);

  async function addDesk() {
    setErr(null);
    setOk(null);
    if (newDeskName.trim().length < 2) return setErr('Desk name is required.');
    try {
      await apiFetch('/desks', { method: 'POST', body: JSON.stringify({ name: newDeskName.trim() }) }).catch(async () => {
        await apiFetch('/tables', { method: 'POST', body: JSON.stringify({ name: newDeskName.trim() }) });
      });
      setNewDeskName('');
      setOk('Desk resource created.');
      await loadAll();
    } catch (e: any) {
      setErr(e?.message || 'Failed to add desk');
    }
  }

  async function deleteDesk(id: string) {
    if (!confirm('Remove this desk resource?')) return;
    setErr(null);
    setOk(null);
    try {
      await apiFetch(`/desks/${id}`, { method: 'DELETE' }).catch(async () => {
        await apiFetch(`/tables/${id}`, { method: 'DELETE' });
      });
      setOk('Desk removed.');
      await loadAll();
    } catch (e: any) {
      setErr(e?.message || 'Failed to remove desk');
    }
  }

  async function deleteItem(id: string) {
    if (!confirm('Remove this SKU resource?')) return;
    setErr(null);
    setOk(null);
    try {
      await apiFetch(`/menu-items/${id}`, { method: 'DELETE' }).catch(async () => {
        await apiFetch(`/menu/${id}`, { method: 'DELETE' });
      });
      setOk('SKU removed.');
      await loadAll();
    } catch (e: any) {
      setErr(e?.message || 'Failed to remove SKU');
    }
  }

  const printQr = useMemo(() => {
    // QR-led: routes to /q/service/print?tenant=<tenantId>
    // If tenantId missing, still show a QR that lands on resources page (fails safe).
    const t = tenantId || 'MISSING_TENANT';
    return `${APP_BASE}/q/service/print?tenant=${encodeURIComponent(t)}`;
  }, [tenantId]);

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: '0 auto' }}>
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

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <button onClick={loadAll} style={{ padding: '10px 14px' }}>
          Refresh
        </button>
      </div>

      <div style={{ border: '1px solid #eee', borderRadius: 14, padding: 14, marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Add Desk Resource</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            value={newDeskName}
            onChange={(e) => setNewDeskName(e.target.value)}
            placeholder="Resource name (desk)"
            style={{ padding: 10, minWidth: 260 }}
          />
          <button onClick={addDesk} style={{ padding: '10px 14px' }}>
            Add Desk
          </button>
        </div>
      </div>

      <h2 style={{ marginTop: 0 }}>Resource Tiles</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
        {/* PRINT is a real QR-led billable resource */}
        <Tile title="Print" subtitle="Resource • SKU: PRINT" qrData={printQr} />

        {/* Desk resources */}
        {desks.map((d) => (
          <Tile
            key={`desk-${d.id}`}
            title={d.name || `Resource ${d.id.slice(0, 6)}`}
            subtitle="Resource • Desk"
            qrData={`${APP_BASE}/q/desk/${d.id}`}
            onDelete={() => deleteDesk(d.id)}
          />
        ))}

        {/* SKU resources */}
        {items.map((i) => (
          <Tile
            key={`item-${i.id}`}
            title={i.name}
            subtitle={`Resource • ${i.sku ? `SKU: ${i.sku}` : 'SKU Item'}`}
            qrData={`${APP_BASE}/q/item/${i.id}`}
            onDelete={() => deleteItem(i.id)}
          />
        ))}
      </div>
    </div>
  );
}
