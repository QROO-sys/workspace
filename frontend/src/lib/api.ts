const base =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "development" ? "http://localhost:3001" : "");

if (!base) throw new Error("NEXT_PUBLIC_API_URL is not set");

export async function apiFetch(path: string, init: RequestInit = {}) {
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = new Headers(init.headers || {});
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(url, { ...init, headers });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg =
      (data && (data.message || data.error)) ||
      (typeof data === "string" ? data : "") ||
      `Request failed: ${res.status}`;
    throw new Error(msg);
  }

  return data;
}
