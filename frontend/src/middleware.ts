import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Protect all /owner/* routes
  if (pathname.startsWith('/owner')) {
    // Expect cookie called 'access_token'
    const token = req.cookies.get('access_token')?.value;
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('from', pathname);
      return NextResponse.redirect(url);
    }

    // Optionally call /api/auth/me to validate (server-side check)
    const verifyRes = await fetch(
      `${req.nextUrl.origin}/api/auth/me`,
      {
        method: 'GET',
        headers: {
          cookie: `access_token=${token}`
        }
      }
    );
    if (!verifyRes.ok) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('from', pathname);
      return NextResponse.redirect(url);
    }
  }
  // otherwise, continue
  return NextResponse.next();
}

export const config = {
  matcher: ['/owner/:path*'],
};