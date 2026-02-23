export async function apiFetch(path: string, options?: RequestInit) {
  const base = (process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "development" ? "http://localhost:3001" : ""));
  if (!base) throw new Error("NEXT_PUBLIC_API_URL is not set"); 
  const res = await fetch(`${base}${path}`, {
    ...options,
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return res.json();
  return res.text();
}
