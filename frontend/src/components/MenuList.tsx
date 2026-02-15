export default function MenuList({ items }: { items: any[] }) {
  return (
    <ul className="space-y-2">
      {items.map(item => (
        <li key={item.id} className="p-3 bg-gray-100 rounded flex justify-between items-center">
          <span>{item.name}</span>
          <span className="font-bold">${item.price}</span>
          <button className="ml-2 text-xs bg-red-500 text-white px-2 py-1 rounded">Delete</button>
        </li>
      ))}
    </ul>
  );
}