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

// MIME type mapping for static assets
const MIME_TYPES: Record<string, string> = {
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.jsx': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'font/eot',
  '.wasm': 'application/wasm',
};

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) return true;
  // Static files and assets
  if (pathname.startsWith('/_next') || pathname.startsWith('/images') || pathname.startsWith('/assets')) return true;
  return false;
}

// Get MIME type based on file extension
function getMimeType(pathname: string): string {
  const ext = pathname.substring(pathname.lastIndexOf('.'));
  return MIME_TYPES[ext] || 'application/octet-stream';
}

// Check if the request is for a static asset that needs special handling
function isStaticAsset(pathname: string): boolean {
  return pathname.startsWith('/_next/static/') ||
         pathname.startsWith('/images/') ||
         pathname.startsWith('/assets/') ||
         pathname.includes('.');
}

// Handle static asset requests with proper headers
async function handleStaticAsset(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;

  if (!isStaticAsset(pathname)) {
    return null;
  }

  try {
    // Let Next.js handle the request but add proper headers
    const response = NextResponse.next();

    // Add proper MIME type header
    const mimeType = getMimeType(pathname);
    response.headers.set('Content-Type', mimeType);

    // Add cache headers for static assets
    if (pathname.startsWith('/_next/static/')) {
      response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (pathname.startsWith('/images/') || pathname.startsWith('/assets/')) {
      response.headers.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    }

    // Security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');

    return response;
  } catch (error) {
    console.error('Error handling static asset:', error);
    return null;
  }
}

export function middleware(req: NextRequest) {
  const { nextUrl, cookies } = req;
  const { pathname } = nextUrl;

  // Handle static assets first
  const assetResponse = handleStaticAsset(req);
  if (assetResponse) {
    return assetResponse;
  }

  const isPublic = isPublicPath(pathname);
  const authToken = cookies.get('auth_token')?.value;

  // If trying to access a protected route without token -> redirect to login
  if (!isPublic && !authToken) {
    const loginUrl = new URL('/auth/login', req.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If authenticated user hits public auth pages, redirect to dashboard
  if (authToken && (pathname === '/' || pathname.startsWith('/auth'))) {
    const dashboardUrl = new URL('/dashboard', req.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on all routes except static assets and api routes (api routes can be proxied to backend)
    '/((?!api|_next/static|_next/image|favicon.ico|images|assets).*)',
  ],
};