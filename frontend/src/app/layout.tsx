import "./globals.css";
import AppHeader from "@/components/AppHeader";
import { cookies } from 'next/headers';
import { dirForLang, normalizeLang } from '@/lib/i18n';

export const metadata = { title: "QROO Workspace" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = normalizeLang(cookies().get('lang')?.value);
  const dir = dirForLang(lang);
  return (
    <html lang={lang === 'ar-eg' ? 'ar-EG' : 'en'} dir={dir}>
      <body className="bg-gray-50 min-h-screen text-gray-900">
        <AppHeader initialLang={lang} />
        <main className="mx-auto max-w-5xl p-4">{children}</main>
      </body>
    </html>
  );
}