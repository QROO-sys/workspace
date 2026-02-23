"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { normalizeLang, t, type Lang } from "@/lib/i18n";

type LoginResponse = {
  ok?: boolean;
  access_token?: string;
  [k: string]: any;
};

const DEBUG_KEY = "qroo_last_login_debug";

export default function LoginPage() {
  const params = useSearchParams();

  const fromParam = params.get("from") || "/owner/dashboard";
  const safeFrom = useMemo(
    () => (fromParam.startsWith("/") ? fromParam : "/owner/dashboard"),
    [fromParam]
  );

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

  // Load last debug message on mount (survives refresh/remount)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DEBUG_KEY);
      if (saved) setInfo(saved);
    } catch {
      // ignore
    }
  }, []);

  function persistInfo(message: string) {
    setInfo(message);
    try {
      localStorage.setItem(DEBUG_KEY, message);
    } catch {
      // ignore
    }
  }

  function persistErr(message: string) {
    setErr(message);
    try {
      localStorage.setItem(DEBUG_KEY, `ERROR: ${message}`);
      setInfo(`ERROR: ${message}`);
    } catch {
      // ignore
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setErr(null);
    setLoading(true);

    // Don’t clear info; we want it to stick for debugging
    persistInfo(
      `Submitting login… from=${safeFrom} time=${new Date().toISOString()}`
    );

    try {
      const res = (await apiFetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      })) as LoginResponse;

      const pretty = JSON.stringify(res);
      persistInfo(`Login response: ${pretty}`);

      const token = res?.access_token;
      if (!token) {
        throw new Error(
          "Login returned 201 but no access_token was returned (cannot proceed)."
        );
      }

      localStorage.setItem("access_token", token);
      persistInfo(
        `Token stored. Redirecting to ${safeFrom} … (time=${new Date().toISOString()})`
      );

      // Hard redirect
      window.location.assign(safeFrom);
      return;
    } catch (e: any) {
      const msg =
        e?.message ||
        (typeof e === "string" ? e : "") ||
        "Login failed (unknown error)";
      console.error("[login] error:", e);
      persistErr(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-24 p-6 rounded shadow bg-white">
      <div className="mb-3 text-xs text-gray-500">
        login-build: 2026-02-23-debug-persist
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

        {info && (
          <div className="mb-3 text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded p-2 break-all whitespace-pre-wrap">
            {info}
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className="text-xs underline"
                onClick={() => {
                  try {
                    localStorage.removeItem(DEBUG_KEY);
                  } catch {}
                  setInfo(null);
                  setErr(null);
                }}
              >
                Clear debug
              </button>
              <button
                type="button"
                className="text-xs underline"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(info);
                    alert("Debug copied");
                  } catch {
                    alert("Copy blocked (click inside page and try again)");
                  }
                }}
              >
                Copy debug
              </button>
            </div>
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
