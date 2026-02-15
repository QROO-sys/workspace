"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function OwnerNav({ role }: { role?: string }) {
  const router = useRouter();

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
  const canSeeAnalytics = role === "OWNER" || role === "MANAGER";
  const isOwner = role === "OWNER";

  return (
    <nav className="mb-4 flex flex-wrap items-center gap-4">
      <Link href="/owner/dashboard" className="underline">
        Dashboard
      </Link>
      <Link href="/owner/sessions" className="underline">
        Sessions
      </Link>
      <Link href="/owner/bookings" className="underline">
        Bookings
      </Link>
      <Link href="/owner/requests" className="underline">
        Requests
      </Link>
      {canManage ? (
        <Link href="/owner/menu" className="underline">
          Menu
        </Link>
      ) : null}
      {canManage ? (
        <Link href="/owner/desks" className="underline">
          Desks
        </Link>
      ) : null}
      {canSeeAnalytics ? (
        <Link href="/owner/analytics" className="underline">
          Analytics
        </Link>
      ) : null}
      {isOwner ? (
        <Link href="/owner/users" className="underline">
          Users
        </Link>
      ) : null}

      <button onClick={logout} className="ml-auto rounded border px-3 py-1 hover:bg-gray-50">
        Logout
      </button>
    </nav>
  );
}
