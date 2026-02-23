"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

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

  return <>{children}</>;
}
