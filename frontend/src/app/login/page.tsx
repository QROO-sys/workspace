"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { normalizeLang, t, type Lang } from "@/lib/i18n";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") || "/owner/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    const match = document.cookie.match(/(?:^|; )lang=([^;]+)/);
    setLang(normalizeLang(match ? decodeURIComponent(match[1]) : "en"));
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      await apiFetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      router.replace(from);
    } catch (e: any) {
      setErr(e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-24 p-6 rounded shadow bg-white">
      <h1 className="font-bold text-2xl mb-4">{t(lang, "signIn")}</h1>

      <form onSubmit={onSubmit}>
        <label className="block text-sm mb-1" htmlFor="email">
          Email
        </label>
        <input
          className="mb-3 w-full p-2 border rounded"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label className="block text-sm mb-1" htmlFor="password">
          Password
        </label>
        <input
          className="mb-4 w-full p-2 border rounded"
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {err && (
          <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
            {err}
          </div>
        )}

        <button
          className="w-full py-2 bg-blue-600 text-white rounded disabled:opacity-60"
          disabled={loading}
          type="submit"
        >
          {loading ? "..." : t(lang, "login")}
        </button>
      </form>

      <div className="mt-4 text-sm text-gray-700">
        No account?{" "}
        <a className="underline" href="/register">
          Register
        </a>
      </div>
    </div>
  );
}
