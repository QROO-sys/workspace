import OwnerNav from "@/components/OwnerNav";
import OwnerDeskList from "@/components/OwnerDeskList";
import { serverApiFetch } from "@/lib/serverApi";

export default async function OwnerDesksPage() {
  const desks = await serverApiFetch("/desks");

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Desks & QR Codes</h1>
          <p className="text-sm text-gray-600">Print these QR codes and place one on each desk.</p>
        </div>
        <OwnerNav />
      </div>

      <OwnerDeskList desks={desks} />
    </div>
  );
}
