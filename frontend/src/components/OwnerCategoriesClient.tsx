"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api";

type Category = { id: string; name: string };

export default function OwnerCategoriesClient({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!name.trim()) return;
    setBusy(true);
    try {
      await apiFetch("/menu-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      setName("");
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "Failed to create");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this category?")) return;
    setBusy(true);
    setErr(null);
    try {
      await apiFetch(`/menu-categories/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "Failed to delete");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6">
      <form onSubmit={create} className="flex gap-2">
        <input className="flex-1 rounded border p-2" placeholder="New category name" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60" disabled={busy} type="submit">
          Add
        </button>
      </form>
      {err && <div className="mt-2 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{err}</div>}

      <div className="mt-4 space-y-2">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded border bg-white p-3">
            <div className="font-medium">{c.name}</div>
            <button className="rounded border px-2 py-1 text-xs" disabled={busy} onClick={() => remove(c.id)} type="button">
              Delete
            </button>
          </div>
        ))}
        {categories.length === 0 && <div className="text-sm text-gray-600">No categories yet.</div>}
      </div>
    </div>
  );
}
