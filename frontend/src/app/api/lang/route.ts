import { NextResponse } from 'next/server';
import { normalizeLang } from '@/lib/i18n';

export async function POST(req: Request) {
  let lang = 'en';
  try {
    const body = await req.json();
    lang = normalizeLang(body?.lang);
  } catch {
    // ignore
  }

  const res = NextResponse.json({ ok: true, lang });
  res.cookies.set('lang', lang, { path: '/', sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 });
  return res;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const lang = normalizeLang(url.searchParams.get('lang'));
  const res = NextResponse.json({ ok: true, lang });
  res.cookies.set('lang', lang, { path: '/', sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 });
  return res;
}
