"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

function NavItem({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <a
      href={href}
      className={
        "block rounded px-3 py-2 text-sm " +
        (active ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100")
      }
    >
      {label}
    </a>
  );
}

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      const from = encodeURIComponent(pathname || "/owner/dashboard");
      window.location.assign(`/login?from=${from}`);
      return;
    }
    setReady(true);
  }, [pathname]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-600">
        Checking session…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen">
        <aside className="w-64 border-r bg-white p-4">
          <div className="font-bold text-lg mb-4">QROO Owner</div>

          <nav className="space-y-1">
            <NavItem href="/owner/dashboard" label="Dashboard" />
            <NavItem href="/owner/desks" label="Desks" />
            <NavItem href="/owner/menu" label="Menu & SKUs" />
            <NavItem href="/owner/bookings" label="Bookings" />
            <NavItem href="/owner/orders" label="Orders" />
            <NavItem href="/owner/revenue" label="Revenue" />
          </nav>

          <div className="mt-6 border-t pt-4">
            <button
              type="button"
              className="w-full rounded border px-3 py-2 text-sm hover:bg-gray-50"
              onClick={() => {
                localStorage.removeItem("access_token");
                window.location.assign("/login");
              }}
            >
              Logout
            </button>
          </div>
        </aside>

        <main className="flex-1">
          <header className="sticky top-0 z-10 border-b bg-white">
            <div className="px-6 py-3 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Owner Panel <span className="ml-2 text-xs text-gray-400">({pathname})</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
                  onClick={() => window.location.reload()}
                >
                  Refresh
                </button>
              </div>
            </div>
          </header>

          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
