import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (!pathname.startsWith('/owner')) return NextResponse.next();

  const token = req.cookies.get('access_token')?.value;
  if (token) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('from', `${pathname}${search || ''}`);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/owner/:path*'],
};
