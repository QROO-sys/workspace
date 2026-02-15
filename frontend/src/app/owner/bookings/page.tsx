import OwnerNav from "@/components/OwnerNav";
import OwnerBookingsClient from "@/components/OwnerBookingsClient";
import { serverApiFetch } from "@/lib/serverApi";

export default async function OwnerBookingsPage() {
  const [desks, menuItems, upcoming] = await Promise.all([
    serverApiFetch("/desks"),
    serverApiFetch("/menu-items"),
    serverApiFetch("/orders/upcoming"),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Bookings</h1>
          <p className="text-sm text-gray-600">Create and manage future desk time slots.</p>
        </div>
        <OwnerNav />
      </div>

      <OwnerBookingsClient desks={desks} menuItems={menuItems} upcoming={upcoming} />
    </div>
  );
}
