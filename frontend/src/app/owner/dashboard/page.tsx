"use client";

import dynamic from "next/dynamic";

const OwnerDeskList = dynamic(() => import("@/components/OwnerDeskList"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center text-sm text-gray-600">
      Loading dashboard…
    </div>
  ),
});

export default function OwnerDashboardPage() {
  return <OwnerDeskList />;
}
