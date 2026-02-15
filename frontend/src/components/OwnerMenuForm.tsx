"use client";
export default function OwnerMenuForm() {
  // form state, API calls to create new menu items

  return (
    <form className="mb-6 space-y-3 p-4 bg-white rounded shadow">
      <input className="w-full p-2 border rounded" placeholder="Item name" />
      <input className="w-full p-2 border rounded" type="number" placeholder="Price" />
      <button className="bg-green-500 text-white px-4 py-2 rounded">Add Menu Item</button>
    </form>
  );
}