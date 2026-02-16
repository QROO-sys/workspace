"use client";

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { normalizeLang, t, type Lang } from '@/lib/i18n';

export default function DbToolsClient() {
  const [busy, setBusy] = useState<string | null>(null);
  const [out, setOut] = useState<string>('');
  const [err, setErr] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>('en');

  useEffect(() => {
    const match = document.cookie.match(/(?:^|; )lang=([^;]+)/);
    setLang(normalizeLang(match ? decodeURIComponent(match[1]) : 'en'));
  }, []);

  async function run(path: string, label: string) {
    setBusy(label);
    setErr(null);
    setOut('');
    try {
      const res = await apiFetch(path, { method: 'POST' });
      setOut([res?.stdout, res?.stderr].filter(Boolean).join('\n') || 'OK');
    } catch (e: any) {
      setErr(e?.message || 'Failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded border bg-white p-4">
        <h1 className="text-xl font-bold">{t(lang, 'dbTools')}</h1>
        <p className="mt-1 text-sm text-gray-600">{t(lang, 'enableDbToolsHint')}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className="rounded border bg-white px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
          disabled={!!busy}
          onClick={() => run('/db-tools/push', 'push')}
        >
          {busy === 'push' ? '…' : t(lang, 'runDbPush')}
        </button>
        <button
          className="rounded border bg-white px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
          disabled={!!busy}
          onClick={() => run('/db-tools/seed', 'seed')}
        >
          {busy === 'seed' ? '…' : t(lang, 'runSeed')}
        </button>
        <button
          className="rounded border border-red-300 bg-white px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
          disabled={!!busy}
          onClick={() => {
            if (confirm('This will wipe your local database. Continue?')) run('/db-tools/reset', 'reset');
          }}
        >
          {busy === 'reset' ? '…' : t(lang, 'runDbReset')}
        </button>
      </div>

      {err ? <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div> : null}
      {out ? (
        <pre className="whitespace-pre-wrap rounded border bg-white p-3 text-xs text-gray-800">{out}</pre>
      ) : (
        <div className="text-xs text-gray-600">
          Tip: if you get “DB tools are disabled”, create backend/.env and set ENABLE_DB_TOOLS=true.
        </div>
      )}
    </div>
  );
}
