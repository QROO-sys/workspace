"use client";

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { normalizeLang, t, type Lang } from '@/lib/i18n';

export default function SmsToolsClient() {
  const [lang, setLang] = useState<Lang>('en');
  const [to, setTo] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const match = document.cookie.match(/(?:^|; )lang=([^;]+)/);
    setLang(normalizeLang(match ? decodeURIComponent(match[1]) : 'en'));
  }, []);

  async function send() {
    setBusy(true);
    setErr(null);
    setResult(null);
    try {
      const res = await apiFetch('/sms/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, message }),
      });
      setResult(res);
    } catch (e: any) {
      setErr(e?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded border bg-white p-4">
        <h1 className="text-xl font-bold">{t(lang, 'smsTools')}</h1>
        <p className="mt-1 text-sm text-gray-600">
          This sends a test message using your configured provider. If SMS_PROVIDER is not set, it will log to the backend
          console.
        </p>
      </div>

      <div className="rounded border bg-white p-4 space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">{t(lang, 'adminPhone')}</label>
            <input
              className="mt-1 w-full rounded border p-2"
              placeholder="+20111..."
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">{t(lang, 'message')}</label>
            <input
              className="mt-1 w-full rounded border p-2"
              placeholder="Test message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>

        <button
          className="rounded border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
          disabled={busy}
          onClick={send}
        >
          {busy ? '…' : t(lang, 'sendTestSms')}
        </button>
      </div>

      {err ? <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div> : null}
      {result ? (
        <pre className="whitespace-pre-wrap rounded border bg-white p-3 text-xs text-gray-800">
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
