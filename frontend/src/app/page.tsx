export default function HomePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-bold">QROO Workspace – Desk Check-in</h1>
      <p className="mt-3 text-gray-700">
        Scan the QR code on a desk to check in, add hours, and add cafe items.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <a className="rounded border bg-white p-4 hover:shadow" href="/login">
          <div className="font-semibold">Admin login</div>
          <div className="text-sm text-gray-600">Owner / staff dashboard</div>
        </a>
        <a className="rounded border bg-white p-4 hover:shadow" href="/owner/dashboard">
          <div className="font-semibold">Owner dashboard</div>
          <div className="text-sm text-gray-600">Requires login</div>
        </a>
      </div>

      <div className="mt-10 rounded border bg-white p-4">
        <div className="font-semibold">Pricing rules</div>
        <ul className="mt-2 list-disc pl-5 text-sm text-gray-700">
          <li>Workspace: <b>100 EGP / hour</b></li>
          <li>Each paid hour includes <b>1 free coffee</b> (coffee is normally 20 EGP)</li>
          <li>Tea: 20 EGP • Pastry: 65 EGP</li>
        </ul>
      </div>
    </div>
  );
}
