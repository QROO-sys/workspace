"use client";
export default function OwnerTableForm() {
  // form state, API calls to add tables
  return (
    <form className="mb-6 space-y-3 p-4 bg-white rounded shadow">
      <input className="w-full p-2 border rounded" placeholder="Table name" />
      <button className="bg-blue-600 text-white px-4 py-2 rounded">Add Table</button>
    </form>
  );
}