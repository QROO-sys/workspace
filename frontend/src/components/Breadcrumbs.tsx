'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LABELS: Record<string, string> = {
  owner: 'Admin',
  dashboard: 'Dashboard',
  sessions: 'Sessions',
  bookings: 'Bookings',
  menu: 'Menu',
  desks: 'Desks',
  analytics: 'Analytics',
  users: 'Users',
  requests: 'Requests',
  login: 'Login',
  register: 'Register',
  checkout: 'Checkout',
};

export default function Breadcrumbs() {
  const pathname = usePathname();
  const parts = pathname.split('/').filter(Boolean);

  if (parts.length <= 1) return null;

  let acc = '';
  return (
    <nav className="text-sm text-gray-600" aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link className="hover:underline" href="/">
            Home
          </Link>
        </li>
        {parts.map((p, idx) => {
          acc += `/${p}`;
          const isLast = idx === parts.length - 1;
          const label = LABELS[p] || p;
          return (
            <li key={`${acc}`} className="flex items-center gap-2">
              <span className="text-gray-400">/</span>
              {isLast ? (
                <span className="text-gray-900">{label}</span>
              ) : (
                <Link className="hover:underline" href={acc}>
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
