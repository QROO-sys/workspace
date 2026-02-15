export default function StatsCards({ todayOrders, activeTables }: { todayOrders: number, activeTables: number }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold">Today's Orders</h2>
        <div className="text-3xl font-bold mt-2">{todayOrders}</div>
      </div>
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold">Active Tables</h2>
        <div className="text-3xl font-bold mt-2">{activeTables}</div>
      </div>
    </div>
  );
}