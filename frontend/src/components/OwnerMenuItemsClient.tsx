"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

type Category = { id: string; name: string };
type MenuItem = { id: string; sku: string; name: string; description?: string | null; price: number; categoryId: string };

export default function OwnerMenuItemsClient({ items, categories }: { items: MenuItem[]; categories: Category[] }) {
  const router = useRouter();
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const catsById = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!sku.trim()) { setErr('SKU is required.'); return; }
    if (!name.trim()) return;
    if (!categoryId) { setErr("Create a category first."); return; }

    setBusy(true);
    try {
      await apiFetch("/menu-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku, name, price: Number(price), description: description || undefined, categoryId }),
      });
      setSku("");
      setName("");
      setPrice(0);
      setDescription("");
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "Failed to create");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this item?")) return;
    setBusy(true);
    setErr(null);
    try {
      await apiFetch(`/menu-items/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "Failed to delete");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6">
      <div className="rounded border bg-white p-4">
        <div className="text-sm text-gray-700">
          <b>Rule:</b> One coffee is free per paid hour. The backend applies the discount using SKUs: <b>Extra hour = 001</b> and <b>Coffee = 002</b>. (Names can change; the SKU rule stays stable.)
        </div>
      </div>

      <form onSubmit={create} className="mt-4 rounded border bg-white p-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <input className="rounded border p-2" placeholder="SKU (e.g., 001)" value={sku} onChange={(e) => setSku(e.target.value)} />
          <input className="rounded border p-2" placeholder="Item name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="rounded border p-2" placeholder="Price (EGP)" value={price} onChange={(e) => setPrice(Number(e.target.value))} type="number" min="0" />
          <select className="rounded border p-2" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input className="rounded border p-2" placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        {err && <div className="mt-3 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{err}</div>}

        <button className="mt-3 rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60" disabled={busy} type="submit">
          Add item
        </button>
      </form>

      <div className="mt-6 space-y-2">
        {items.map((it) => (
          <div key={it.id} className="flex items-center justify-between rounded border bg-white p-3">
            <div>
              <div className="font-medium">[{it.sku}] {it.name} — {it.price} EGP</div>
              <div className="text-xs text-gray-600">
                {catsById.get(it.categoryId)?.name || "Category"}{it.description ? ` • ${it.description}` : ""}
              </div>
            </div>
            <button className="rounded border px-2 py-1 text-xs" disabled={busy} onClick={() => remove(it.id)} type="button">
              Delete
            </button>
          </div>
        ))}
        {items.length === 0 && <div className="text-sm text-gray-600">No menu items yet.</div>}
      </div>
    </div>
  );
}
