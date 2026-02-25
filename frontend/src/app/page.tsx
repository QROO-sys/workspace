"use client";

import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded border bg-white p-6 space-y-4">
        <div className="text-2xl font-bold">QROO Workspace</div>
        <div className="text-sm text-gray-600">
          Single sign-on. You’ll be routed to the correct panel based on your role.
        </div>

        <button
          className="w-full rounded bg-gray-900 py-2 text-white"
          onClick={() => router.push("/login")}
          type="button"
        >
          Sign in
        </button>
      </div>
    </div>
  );
}
