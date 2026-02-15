import OwnerRequestsClient from "@/components/OwnerRequestsClient";
import { serverApiFetch } from "@/lib/serverApi";

export default async function OwnerRequestsPage() {
  const requests = await serverApiFetch("/table-requests");

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div>
        <h1 className="text-2xl font-bold">Live requests</h1>
        <p className="text-sm text-gray-600">Requests are created when guests scan a desk QR and order time/items or press a “call staff” button.</p>
      </div>

      <OwnerRequestsClient requests={requests} />
    </div>
  );
}
