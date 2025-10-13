import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get the pathname of the request (e.g. /, /dashboard, /party/dashboard)
  const path = request.nextUrl.pathname;

  // Get the token from cookies (if you're using cookies) or headers
  // Note: Since we're using localStorage, we can't check auth in middleware
  // Authentication will be handled on the client side in page components
  
  // For now, just allow all requests through
  // Each protected page will handle its own authentication check
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/party/:path*',
  ],
};

