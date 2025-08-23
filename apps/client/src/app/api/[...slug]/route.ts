import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const DEFAULT_BACKEND = 'http://localhost:8080';

async function getBackendUrl() {
  // In Next.js 15, we can get the host from headers in a server component
  // For API routes, we'll use environment variables
  const baseURL = (process.env.NEXT_PUBLIC_API_URL || DEFAULT_BACKEND).replace(/\/$/, '');
  return baseURL.endsWith('/api') ? baseURL : `${baseURL}/api`;
}

async function handleRequest(request: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  try {
    const { slug } = await params;
    const method = request.method;
    const backendUrl = await getBackendUrl();

    // Health endpoint is now handled by a separate route file

    // Construct the target URL
    const path = slug.join('/');
    const url = `${backendUrl}/${path}`;

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();
    const fullUrl = queryString ? `${url}?${queryString}` : url;

    // Prepare headers to forward
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Forward important headers from the original request
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const debugClient = request.headers.get('x-debug-client');
    if (debugClient) {
      headers['X-Debug-Client'] = debugClient;
    }

    const userAgent = request.headers.get('user-agent');
    if (userAgent) {
      headers['User-Agent'] = userAgent;
    }

    // Get request body for POST/PUT/PATCH requests
    let body: any = undefined;
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      try {
        const text = await request.text();
        if (text) {
          body = JSON.parse(text);
        }
      } catch (e) {
        // If JSON parsing fails, try to get text again
        try {
          body = await request.text();
          headers['Content-Type'] = 'text/plain';
        } catch (textError) {
          console.error('[API] Failed to read request body:', textError);
        }
      }
    }

    console.log(`[API Proxy] ${method} /${path} -> ${fullUrl}`, {
      hasAuth: !!authHeader,
      hasData: !!body,
    });

    // Make the request to the backend using fetch (recommended for Next.js 15)
    const response = await fetch(fullUrl, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      // Don't set cache headers to ensure fresh data
      cache: 'no-store',
    });

    const responseData = await response.json().catch(() => ({}));

    console.log(`[API Proxy] Response ${response.status} for ${method} /${path}`);

    // Forward the response with proper status
    return NextResponse.json(responseData, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (error: any) {
    console.error('[API Proxy] Error:', {
      message: error?.message,
      cause: error?.cause,
    });

    // Return appropriate error response
    return NextResponse.json(
      {
        message: 'Proxy error: Unable to connect to backend server',
        error: error?.message || 'Unknown error',
        backend_url: await getBackendUrl(),
      },
      { status: 502 }
    );
  }
}

// Export handlers for all HTTP methods
export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
export const OPTIONS = handleRequest;
