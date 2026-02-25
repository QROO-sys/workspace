"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type AnyObj = Record<string, any>;
type Role = "OWNER" | "ADMIN" | "EMPLOYEE" | "RENTER";

export default function OwnerUsersPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [users, setUsers] = useState<AnyObj[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const res = await apiFetch("/users", { method: "GET" });
      const arr = Array.isArray(res) ? res : res?.users || res?.items || [];
      setUsers(arr);
    } catch (e: any) {
      setErr(e?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function updateRole(id: string, role: Role) {
    setBusyId(id);
    try {
      await apiFetch(`/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      await load();
    } catch (e: any) {
      alert(e?.message || "Role update failed (backend may not allow yet)");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <div className="text-sm text-gray-600">Loading users…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-2xl font-bold">Users</div>
          <div className="text-sm text-gray-600">Owner can change roles (permissions enforced next).</div>
        </div>
        <button className="rounded border px-3 py-2 text-sm hover:bg-gray-50" onClick={load} type="button">
          Refresh
        </button>
      </div>

      {err && (
        <div className="rounded border bg-red-50 p-3 text-sm text-red-800 border-red-200">
          {err}
        </div>
      )}

      <div className="overflow-auto rounded border bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 px-3">Email</th>
              <th className="py-2 px-3">Role</th>
              <th className="py-2 px-3">Tenant</th>
              <th className="py-2 px-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u: any) => (
              <tr key={u.id} className="border-b last:border-b-0">
                <td className="py-2 px-3">{String(u.email || "")}</td>
                <td className="py-2 px-3">{String(u.role || "")}</td>
                <td className="py-2 px-3">{String(u.tenantId || "")}</td>
                <td className="py-2 px-3">
                  <select
                    className="border rounded p-1 text-sm"
                    disabled={busyId === u.id}
                    value={String(u.role || "RENTER")}
                    onChange={(e) => updateRole(u.id, e.target.value as Role)}
                  >
                    <option value="OWNER">OWNER</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="EMPLOYEE">EMPLOYEE</option>
                    <option value="RENTER">RENTER</option>
                  </select>
                </td>
              </tr>
            ))}
            {!users.length && (
              <tr>
                <td className="py-4 px-3 text-gray-600" colSpan={4}>No users found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
