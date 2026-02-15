"use client";

import { useEffect, useState } from "react";
import OwnerNav from "./OwnerNav";
import { apiFetch } from "@/lib/api";

export default function OwnerShell({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    apiFetch("/auth/me")
      .then((d) => {
        if (!mounted) return;
        // Backend returns { user: { ... } }
        setMe(d?.user || null);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e?.message || "Unauthorized");
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (error) {
    return (
      <div className="rounded border bg-white p-4">
        <div className="font-semibold">Access problem</div>
        <div className="mt-1 text-sm text-gray-700">{error}</div>
      </div>
    );
  }

  return (
    <div>
      <OwnerNav role={me?.role} />
      {children}
    </div>
  );
}
