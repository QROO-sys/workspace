import "./globals.css";
import AppHeader from "@/components/AppHeader";

export const metadata = { title: "QROO Workspace" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen text-gray-900">
        <AppHeader />
        <main className="mx-auto max-w-5xl p-4">{children}</main>
      </body>
    </html>
  );
}