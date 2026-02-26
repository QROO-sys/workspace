import { cookies } from "next/headers";

export type ServerApiFetchOptions = RequestInit & { body?: any };

function getApiBase(): string {
  const prodDefault = "https://api.qr-oo.com";

  const fromEnv =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.API_BASE_URL ||
    "";

  if (fromEnv) return fromEnv;

  if (process.env.NODE_ENV === "development") return "http://localhost:3001";

  return prodDefault;
}

export async function serverApiFetch(path: string, options: ServerApiFetchOptions = {}) {
  const base = getApiBase();
  const url = path.startsWith("http") ? path : `${base}${path.startsWith("/") ? "" : "/"}${path}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && options.body != null) {
    headers.set("Content-Type", "application/json");
  }

  // Try to forward access_token if present as a cookie (or whatever your middleware sets).
  // This keeps server components working without crashing builds.
  const cookieStore = cookies();
  const accessToken = cookieStore.get("access_token")?.value || cookieStore.get("token")?.value || null;
  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const body =
    options.body != null && typeof options.body !== "string"
      ? JSON.stringify(options.body)
      : options.body;

  const res = await fetch(url, {
    ...options,
    headers,
    body,
    cache: "no-store",
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {}

  if (!res.ok) {
    const message = json?.message || json?.error || text || `Request failed (${res.status})`;
    throw new Error(message);
  }

  return json;
}
