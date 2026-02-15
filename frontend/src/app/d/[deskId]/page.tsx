import DeskCheckinClient from "@/components/DeskCheckinClient";

export default async function DeskPage({ params }: { params: { deskId: string } }) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const [deskRes, upcomingRes] = await Promise.all([
    fetch(`${apiBase}/public/desks/${params.deskId}`, { cache: "no-store" }),
    fetch(`${apiBase}/public/desks/${params.deskId}/upcoming`, { cache: "no-store" }),
  ]);

  if (!deskRes.ok) {
    return (
      <div className="mx-auto max-w-md px-6 py-10">
        <h1 className="text-xl font-bold">Desk not found</h1>
        <p className="mt-2 text-sm text-gray-700">This QR code may be invalid.</p>
      </div>
    );
  }

  const data = await deskRes.json();
  const upcomingData = upcomingRes.ok ? await upcomingRes.json() : { upcoming: [] };

  return <DeskCheckinClient desk={data.desk} menuItems={data.menuItems} upcoming={upcomingData.upcoming || []} />;
}
