"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GLOBAL ERROR]", {
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
      digest: (error as any)?.digest,
    });
  }, [error]);

  return (
    <html>
      <body style={{ fontFamily: "system-ui", padding: 24 }}>
        <h2>Application error</h2>
        <p>
          Check Vercel logs for <strong>[GLOBAL ERROR]</strong>.
        </p>
        <p>
          Digest: <code>{(error as any)?.digest || "N/A"}</code>
        </p>
        <button
          onClick={() => reset()}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #ddd",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
