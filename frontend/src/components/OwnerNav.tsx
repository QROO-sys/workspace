"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";
import { normalizeLang, t, type Lang } from "@/lib/i18n";

export default function OwnerNav({ role }: { role?: string }) {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    if (typeof document === "undefined") return;
    const match = document.cookie.match(/(?:^|; )lang=([^;]+)/);
    setLang(normalizeLang(match ? decodeURIComponent(match[1]) : "en"));
  }, []);

  async function logout() {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    router.push("/login");
    router.refresh();
  }

  const canManage = role === "OWNER" || role === "MANAGER";
  const canSeeAnalytics = role === "OWNER" || role === "MANAGER" || role === "STAFF";
  const isOwner = role === "OWNER";

  // Visible deploy stamp (proves which deployment you're actually seeing)
  const stamp = useMemo(() => {
    const sha =
      process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
      process.env.VERCEL_GIT_COMMIT_SHA ||
      process.env.NEXT_PUBLIC_GIT_SHA ||
      "";
    return sha ? sha.slice(0, 7) : "no-sha";
  }, []);

  return (
    <nav className="mb-4 flex flex-wrap items-center gap-4">
      <Link href="/owner/dashboard" className="underline">
        {t(lang, "dashboard")}
      </Link>
      <Link href="/owner/sessions" className="underline">
        Sessions
      </Link>
      <Link href="/owner/bookings" className="underline">
        {t(lang, "bookings")}
      </Link>
      <Link href="/owner/requests" className="underline">
        {t(lang, "requests")}
      </Link>

      {/* Resources replaces Desks + Menu & SKUs */}
      {canManage ? (
        <Link href="/owner/resources" className="underline">
          Resources
        </Link>
      ) : null}

      {canSeeAnalytics ? (
        <Link href="/owner/analytics" className="underline">
          {t(lang, role === "STAFF" ? "dailyRevenue" : "analytics")}
        </Link>
      ) : null}

      {isOwner ? (
        <Link href="/owner/users" className="underline">
          {t(lang, "users")}
        </Link>
      ) : null}
      {isOwner ? (
        <Link href="/owner/sms" className="underline">
          {t(lang, "smsTools")}
        </Link>
      ) : null}
      {isOwner ? (
        <Link href="/owner/db-tools" className="underline">
          {t(lang, "dbTools")}
        </Link>
      ) : null}

      <span className="ml-auto text-xs text-gray-500">UI {stamp}</span>

      <button onClick={logout} className="rounded border px-3 py-1 hover:bg-gray-50">
        {t(lang, "logout")}
      </button>
    </nav>
  );
}
