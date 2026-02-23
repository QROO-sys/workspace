import DeskCheckinClient from "@/components/DeskCheckinClient";

export default async function DeskBookingPage({ params }: { params: { deskId: string } }) {
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "development" ? "http://localhost:3001" : ""));
  const res = await fetch(`${apiBase}/public/desks/${params.deskId}`, { cache: "no-store" });

  if (!res.ok) {
    return (
      <div className="mx-auto max-w-md px-6 py-10">
        <h1 className="text-xl font-bold">Desk not found</h1>
        <p className="mt-2 text-sm text-gray-700">This QR code may be invalid.</p>
      </div>
    );
  }

  const data = await res.json();
  return <DeskCheckinClient desk={data.desk} menuItems={data.menuItems || []} upcoming={data.upcomingBookings || []} defaultMode="LATER" />;
}
