import { NextResponse, NextRequest } from 'next/server';

// Public routes that do NOT require authentication
const PUBLIC_PATHS: string[] = [
  '/',
  '/auth/login',
  '/auth/register',
  '/auth/password/forgot',
  '/auth/password/reset',
  '/_next', // allow Next assets
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) return true;
  // Static files and assets
  if (pathname.startsWith('/_next') || pathname.startsWith('/images') || pathname.startsWith('/assets')) return true;
  return false;
}

export function middleware(req: NextRequest) {
  const { nextUrl, cookies } = req;
  const { pathname } = nextUrl;

  const isPublic = isPublicPath(pathname);
  const authToken = cookies.get('auth_token')?.value;

  // If trying to access a protected route without token -> redirect to login
  if (!isPublic && !authToken) {
    const loginUrl = new URL('/auth/login', req.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If authenticated user hits public auth pages, redirect to dashboard
  // if (authToken && (pathname === '/' || pathname.startsWith('/auth'))) {
  //   const dashboardUrl = new URL('/dashboard', req.url);
  //   return NextResponse.redirect(dashboardUrl);
  // }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on all routes except static assets and api routes (api routes can be proxied to backend)
    '/((?!api|_next/static|_next/image|favicon.ico|images|assets).*)',
  ],
};