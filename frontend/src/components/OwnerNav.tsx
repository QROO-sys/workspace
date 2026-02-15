export default function OwnerNav() {
  return (
    <nav className="flex flex-wrap gap-3 text-sm">
      <a className="underline" href="/owner/dashboard">Dashboard</a>
      <a className="underline" href="/owner/desks">Desks</a>
      <a className="underline" href="/owner/menu">Menu items</a>
      <a className="underline" href="/owner/menu-categories">Categories</a>
      <a className="underline" href="/owner/sessions">Sessions</a>
      <a className="underline" href="/owner/bookings">Bookings</a>
    </nav>
  );
}
