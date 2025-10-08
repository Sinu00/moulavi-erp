import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Note: Middleware runs on the server and cannot access localStorage
  // Authentication is handled on the client side in page components
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/party/:path*',
  ],
};

