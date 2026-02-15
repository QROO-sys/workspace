"use client";

import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function OwnerUsersClient({ users }: { users: any[] }) {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("ChangeMe123!");
  const [role, setRole] = useState<"MANAGER" | "STAFF">("STAFF");

  async function createUser() {
    setErr(null);
    setBusy(true);
    try {
      await apiFetch("/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password, role }),
      });
      setEmail("");
      setName("");
      setPassword("ChangeMe123!");
      setRole("STAFF");
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "Failed to create user");
    } finally {
      setBusy(false);
    }
  }

  async function updateRole(id: string, nextRole: string) {
    setErr(null);
    setBusy(true);
    try {
      await apiFetch(`/users/${id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "Failed to update role");
    } finally {
      setBusy(false);
    }
  }

  async function disable(id: string) {
    setErr(null);
    setBusy(true);
    try {
      await apiFetch(`/users/${id}/disable`, { method: "PATCH" });
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "Failed to disable user");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6">
      {err && <div className="mb-3 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{err}</div>}

      <div className="rounded border bg-white p-4">
        <div className="text-sm font-semibold">Add staff / manager</div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div>
            <label className="text-xs text-gray-600">Name</label>
            <input className="mt-1 w-full rounded border px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-600">Email</label>
            <input className="mt-1 w-full rounded border px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-600">Temporary password</label>
            <input className="mt-1 w-full rounded border px-3 py-2" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-600">Role</label>
            <select className="mt-1 w-full rounded border px-3 py-2" value={role} onChange={(e) => setRole(e.target.value as any)}>
              <option value="STAFF">Staff</option>
              <option value="MANAGER">Manager</option>
            </select>
          </div>
        </div>
        <button
          type="button"
          disabled={busy || !email || !name || !password}
          className="mt-3 rounded bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-60"
          onClick={createUser}
        >
          Create user
        </button>
        <div className="mt-2 text-xs text-gray-600">Owners can add staff/manager accounts here. Staff cannot access pricing or user management.</div>
      </div>

      <div className="mt-4 overflow-x-auto rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-3 py-2">{u.name || "—"}</td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">{u.role}</td>
                <td className="px-3 py-2">{u.deleted ? "Disabled" : "Active"}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    {u.role !== "OWNER" ? (
                      <>
                        <button
                          type="button"
                          className="rounded border px-3 py-1 text-xs"
                          disabled={busy || u.deleted}
                          onClick={() => updateRole(u.id, u.role === "MANAGER" ? "STAFF" : "MANAGER")}
                        >
                          Set {u.role === "MANAGER" ? "Staff" : "Manager"}
                        </button>
                        <button
                          type="button"
                          className="rounded bg-gray-700 px-3 py-1 text-xs text-white"
                          disabled={busy || u.deleted}
                          onClick={() => disable(u.id)}
                        >
                          Disable
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-gray-600">Owner</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 ? (
              <tr><td className="px-3 py-4 text-gray-600" colSpan={5}>No users.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
