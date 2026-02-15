"use client";
import { useState } from "react";
import { apiFetch } from "@/lib/api";

export default function MenuCategoryForm({ onCreate }: { onCreate?: () => void }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await apiFetch("/menu-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setName(""); setLoading(false);
    onCreate?.();
  }

  return (
    <form className="mb-4 flex gap-2" onSubmit={handleSubmit}>
      <input className="p-2 border rounded" value={name} onChange={e => setName(e.target.value)} placeholder="Category name" required />
      <button className="px-4 py-2 bg-green-600 text-white rounded" type="submit" disabled={loading}>Add</button>
    </form>
  );
}