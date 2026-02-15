import OwnerNav from "@/components/OwnerNav";
import OwnerMenuItemsClient from "@/components/OwnerMenuItemsClient";
import { serverApiFetch } from "@/lib/serverApi";

export default async function OwnerMenuPage() {
  const [items, categories] = await Promise.all([
    serverApiFetch("/menu-items"),
    serverApiFetch("/menu-categories"),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Menu Items</h1>
          <p className="text-sm text-gray-600">Cafe + time items available from desk QR.</p>
        </div>
        <OwnerNav />
      </div>

      <OwnerMenuItemsClient items={items} categories={categories} />
    </div>
  );
}
