'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Breadcrumbs from './Breadcrumbs';
import { apiFetch } from '@/lib/api';

export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [hasCookie, setHasCookie] = useState(false);

  useEffect(() => {
    setHasCookie(typeof document !== 'undefined' && document.cookie.includes('access_token='));
  }, [pathname]);

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
          <Link className="hover:underline" href="/register">
            Register
          </Link>
          <Link className="hover:underline" href="/login">
            Login
          </Link>
          <Link className="hover:underline" href="/owner/dashboard">
            Admin
          </Link>
          {hasCookie ? (
            <button className="rounded border px-3 py-1 hover:bg-gray-50" onClick={logout}>
              Logout
            </button>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
