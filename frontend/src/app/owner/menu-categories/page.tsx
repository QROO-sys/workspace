import OwnerNav from "@/components/OwnerNav";
import OwnerCategoriesClient from "@/components/OwnerCategoriesClient";
import { serverApiFetch } from "@/lib/serverApi";

export default async function OwnerMenuCategoriesPage() {
  const categories = await serverApiFetch("/menu-categories");

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Menu Categories</h1>
          <p className="text-sm text-gray-600">Organize cafe/time items.</p>
        </div>
        <OwnerNav />
      </div>

      <OwnerCategoriesClient categories={categories} />
    </div>
  );
}
