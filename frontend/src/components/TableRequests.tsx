"use client";
export default function TableRequests({ tableId }: { tableId: string }) {
  // send request to call staff, order, etc.
  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold mb-2">Need Assistance?</h2>
      <button className="bg-yellow-500 text-white px-4 py-2 rounded mb-2 block w-full">Call Staff</button>
      <button className="bg-blue-500 text-white px-4 py-2 rounded block w-full">Request Water</button>
    </div>
  );
}