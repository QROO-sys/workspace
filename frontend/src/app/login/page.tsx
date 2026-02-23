"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { normalizeLang, t, type Lang } from "@/lib/i18n";

type LoginResponse = {
  ok?: boolean;
  access_token?: string;
  [k: string]: any;
};

export default function LoginPage() {
  const params = useSearchParams();

  const fromParam = params.get("from") || "/owner/dashboard";
  const safeFrom = fromParam.startsWith("/") ? fromParam : "/owner/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    const match = document.cookie.match(/(?:^|; )lang=([^;]+)/);
    setLang(normalizeLang(match ? decodeURIComponent(match[1]) : "en"));
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setErr(null);
    setInfo(null);
    setLoading(true);

    try {
      const res = (await apiFetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      })) as LoginResponse;

      // Show what we got back (helps confirm success/failure)
      setInfo(`Login response: ${JSON.stringify(res)}`);

      const token = res?.access_token;
      if (!token) {
        throw new Error("Login succeeded but no access_token was returned.");
      }

      localStorage.setItem("access_token", token);

      // Hard redirect (most reliable)
      window.location.assign(safeFrom);
      return;
    } catch (e: any) {
      const msg =
        e?.message ||
        (typeof e === "string" ? e : "") ||
        "Login failed (unknown error)";
      console.error("[login] error:", e);
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-24 p-6 rounded shadow bg-white">
      <div className="mb-3 text-xs text-gray-500">
        login-build: 2026-02-23-prodfix
      </div>

      <div className="font-bold text-2xl mb-4">{t(lang, "signIn")}</div>

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

        {info && !err && (
          <div className="mb-3 text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded p-2 break-all">
            {info}
          </div>
        )}

        <button
          className="w-full py-2 bg-blue-600 text-white rounded disabled:opacity-60"
          disabled={loading}
          type="submit"
        >
          {loading ? "Signing in..." : t(lang, "login")}
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
