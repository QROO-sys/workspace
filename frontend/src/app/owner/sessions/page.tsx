import OwnerSessionsClient from "@/components/OwnerSessionsClient";
import { serverApiFetch } from "@/lib/serverApi";

export default async function OwnerSessionsPage() {
  const orders = await serverApiFetch("/orders");

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div>
        <h1 className="text-2xl font-bold">Sessions</h1>
        <p className="text-sm text-gray-600">Each check-in creates a session (order) for a desk.</p>
      </div>

      <OwnerSessionsClient orders={orders} />
    </div>
  );
}
