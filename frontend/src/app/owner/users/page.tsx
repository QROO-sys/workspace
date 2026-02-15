import OwnerUsersClient from "@/components/OwnerUsersClient";
import { serverApiFetch } from "@/lib/serverApi";
import { redirect } from "next/navigation";

export default async function OwnerUsersPage() {
  const me = await serverApiFetch("/auth/me");
  if (me?.user?.role !== "OWNER") {
    redirect("/owner/dashboard");
  }

  const users = await serverApiFetch("/users");

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div>
        <h1 className="text-2xl font-bold">Staff permissions</h1>
        <p className="text-sm text-gray-600">Create staff accounts and control access tiers (Owner → Manager → Staff).</p>
      </div>

      <OwnerUsersClient users={users} />
    </div>
  );
}
