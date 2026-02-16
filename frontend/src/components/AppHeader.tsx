'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Breadcrumbs from './Breadcrumbs';
import { apiFetch } from '@/lib/api';
import { normalizeLang, t, type Lang } from '@/lib/i18n';

export default function AppHeader({ initialLang }: { initialLang?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [hasCookie, setHasCookie] = useState(false);
  const [lang, setLang] = useState<Lang>(normalizeLang(initialLang));

  useEffect(() => {
    setHasCookie(typeof document !== 'undefined' && document.cookie.includes('access_token='));
    // If server didn't pass it (client-only render), read it.
    if (!initialLang && typeof document !== 'undefined') {
      const match = document.cookie.match(/(?:^|; )lang=([^;]+)/);
      setLang(normalizeLang(match ? decodeURIComponent(match[1]) : 'en'));
    }
  }, [pathname]);

  async function setLanguage(next: Lang) {
    setLang(next);
    try {
      await fetch('/api/lang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang: next }),
      });
    } finally {
      router.refresh();
    }
  }

  async function logout() {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex flex-col gap-1">
          <Link href="/" className="text-lg font-semibold">
            QROO Workspace
          </Link>
          <Breadcrumbs />
        </div>

        <nav className="flex items-center gap-3 text-sm">
          <select
            className="rounded border bg-white px-2 py-1"
            value={lang}
            onChange={(e) => setLanguage(normalizeLang(e.target.value))}
            aria-label={t(lang, 'langSwitch')}
          >
            <option value="en">{t('en', 'langName')}</option>
            <option value="ar-eg">{t('ar-eg', 'langName')}</option>
          </select>
          <Link className="hover:underline" href="/register">
            Register
          </Link>
          <Link className="hover:underline" href="/login">
            {t(lang, 'login')}
          </Link>
          <Link className="hover:underline" href="/owner/dashboard">
            Admin
          </Link>
          {hasCookie ? (
            <button className="rounded border px-3 py-1 hover:bg-gray-50" onClick={logout}>
              {t(lang, 'logout')}
            </button>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
