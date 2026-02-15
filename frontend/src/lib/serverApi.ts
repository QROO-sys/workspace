import { cookies } from "next/headers";

export async function serverApiFetch(path: string) {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const cookieStore = cookies();
  const access = cookieStore.get("access_token")?.value;

  const res = await fetch(`${base}${path}`, {
    cache: "no-store",
    headers: access ? { cookie: `access_token=${access}` } : {},
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }

  return res.json();
}
