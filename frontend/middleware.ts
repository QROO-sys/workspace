import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Pass-through middleware.
// Auth is handled client-side (localStorage JWT) under /owner layout.
// Middleware runs server-side and cannot read localStorage.
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
