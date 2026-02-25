"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type AnyObj = Record<string, any>;

function toArr(x: any): any[] {
  if (Array.isArray(x)) return x;
  if (Array.isArray(x?.items)) return x.items;
  if (Array.isArray(x?.data)) return x.data;
  if (Array.isArray(x?.menuItems)) return x.menuItems;
  if (Array.isArray(x?.categories)) return x.categories;
  return [];
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded border bg-white p-4">
      <div className="font-semibold mb-3">{title}</div>
      {children}
    </div>
  );
}

function Table({
  cols,
  rows,
  empty,
}: {
  cols: { k: string; label: string }[];
  rows: AnyObj[];
  empty: string;
}) {
  if (!rows.length) return <div className="text-sm text-gray-600">{empty}</div>;

  return (
    <div className="overflow-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            {cols.map((c) => (
              <th key={c.k} className="py-2 pr-4 font-medium">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id || r._id || i} className="border-b last:border-b-0">
              {cols.map((c) => (
                <td key={c.k} className="py-2 pr-4 whitespace-nowrap">
                  {String(r?.[c.k] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function OwnerMenuPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [categories, setCategories] = useState<AnyObj[]>([]);
  const [items, setItems] = useState<AnyObj[]>([]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setErr(null);
        setLoading(true);

        // Your backend controllers:
        // @Controller('menu-items')
        // @Controller('menu-categories')
        const [catsRes, itemsRes] = await Promise.all([
          apiFetch("/menu-categories", { method: "GET" }).catch(() => null),
          apiFetch("/menu-items", { method: "GET" }),
        ]);

        if (!alive) return;

        setCategories(toArr(catsRes));
        setItems(
          toArr(itemsRes).map((m: any) => ({
            ...m,
            sku: String(m?.sku ?? m?.SKU ?? ""),
            name: String(m?.name ?? m?.title ?? ""),
            price: m?.price ?? m?.amount ?? "",
            category: String(m?.category?.name ?? m?.categoryName ?? ""),
          }))
        );
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Failed to load menu");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-sm text-gray-600">
        Loading menu…
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-xl w-full rounded border bg-white p-4">
          <div className="font-semibold mb-2">Menu error</div>
          <div className="text-sm text-red-700 break-words">{err}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-bold">Menu & SKUs</div>
        <div className="text-sm text-gray-600">
          Categories: {categories.length} • Items: {items.length}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Categories">
          <Table
            empty="No categories."
            cols={[
              { k: "name", label: "Name" },
              { k: "id", label: "ID" },
            ]}
            rows={categories.map((c: any) => ({
              ...c,
              name: String(c?.name ?? ""),
              id: String(c?.id ?? c?._id ?? ""),
            }))}
          />
        </Section>

        <Section title="Menu Items (SKU, Price)">
          <Table
            empty="No menu items."
            cols={[
              { k: "sku", label: "SKU" },
              { k: "name", label: "Item" },
              { k: "price", label: "Price" },
              { k: "category", label: "Category" },
            ]}
            rows={items}
          />
        </Section>
      </div>
    </div>
  );
}
