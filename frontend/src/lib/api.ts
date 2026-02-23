const base =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "development" ? "http://localhost:3001" : "");

if (!base) throw new Error("NEXT_PUBLIC_API_URL is not set");

export async function apiFetch(path: string, init: RequestInit = {}) {
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  console.log("[apiFetch]", init.method || "GET", url);

  const res = await fetch(url, {
    ...init,
    credentials: "include", // safe even if you don't use cookies
const token =
  typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

const headers = new Headers(init.headers || {});
if (token) headers.set("Authorization", `Bearer ${token}`);

const res = await fetch(url, { ...init, headers });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  console.log("[apiFetch] status", res.status, data);

  if (!res.ok) {
    const msg =
      (data && (data.message || data.error)) ||
      (typeof data === "string" ? data : "") ||
      `Request failed: ${res.status}`;
    throw new Error(msg);
  }

  return data;
}
