export type ApiFetchOptions = RequestInit & { body?: any };

function getApiBase(): string {
  // Never crash the build if env is missing.
  // Production default for your platform:
  const prodDefault = "https://api.qr-oo.com";

  const fromEnv =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "";

  if (fromEnv) return fromEnv;

  if (process.env.NODE_ENV === "development") return "http://localhost:3001";

  return prodDefault;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    window.localStorage.getItem("access_token") ||
    window.localStorage.getItem("token") ||
    window.localStorage.getItem("jwt")
  );
}

export async function apiFetch(path: string, options: ApiFetchOptions = {}) {
  const base = getApiBase();
  const url = path.startsWith("http") ? path : `${base}${path.startsWith("/") ? "" : "/"}${path}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && options.body != null) {
    headers.set("Content-Type", "application/json");
  }

  const token = getToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const body =
    options.body != null && typeof options.body !== "string"
      ? JSON.stringify(options.body)
      : options.body;

  const res = await fetch(url, {
    ...options,
    headers,
    body,
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore
  }

  if (!res.ok) {
    const message =
      json?.message ||
      json?.error ||
      text ||
      `Request failed (${res.status})`;
    throw new Error(message);
  }

  return json;
}
