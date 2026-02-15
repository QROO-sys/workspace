import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const base = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const cookie = req.headers.get('cookie') || '';

  const r = await fetch(`${base}/auth/me`, {
    method: 'GET',
    headers: {
      cookie,
    },
    // Server-to-server request; cookies forwarded via header.
    cache: 'no-store',
  });

  const text = await r.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  return NextResponse.json(data, { status: r.status });
}
