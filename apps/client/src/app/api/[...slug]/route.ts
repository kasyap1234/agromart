import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const DEFAULT_BACKEND = 'http://localhost:8080';

const getBackendUrl = () => {
  const baseURL = (process.env.NEXT_PUBLIC_API_URL || DEFAULT_BACKEND).replace(/\/$/, '');
  return baseURL.endsWith('/api') ? baseURL : `${baseURL}/api`;
};

async function handleRequest(req: NextRequest, { params }: { params: { slug: string[] } }) {
  try {
    const { slug } = params;
    const method = req.method;
    const backendUrl = getBackendUrl();

    // Skip the health endpoint as it's handled separately
    if (slug[0] === 'health') {
      return NextResponse.json({ message: 'Health endpoint not proxied' }, { status: 404 });
    }

    // Construct the target URL
    const path = slug.join('/');
    const url = `${backendUrl}/${path}`;

    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const queryString = searchParams.toString();
    const fullUrl = queryString ? `${url}?${queryString}` : url;

    // Prepare headers to forward
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Forward important headers from the original request
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const debugClient = req.headers.get('x-debug-client');
    if (debugClient) {
      headers['X-Debug-Client'] = debugClient;
    }

    const userAgent = req.headers.get('user-agent');
    if (userAgent) {
      headers['User-Agent'] = userAgent;
    }

    // Get request body for POST/PUT/PATCH requests
    let data: any = undefined;
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      try {
        const text = await req.text();
        if (text) {
          data = JSON.parse(text);
        }
      } catch (e) {
        // If JSON parsing fails, try to get text again
        try {
          data = await req.text();
          headers['Content-Type'] = 'text/plain';
        } catch (textError) {
          console.error('[API] Failed to read request body:', textError);
        }
      }
    }

    console.log(`[API Proxy] ${method} /${path} -> ${fullUrl}`, {
      hasAuth: !!authHeader,
      hasData: !!data,
    });

    // Make the request to the backend
    const response = await axios({
      method: method.toLowerCase() as any,
      url: fullUrl,
      data,
      headers,
      timeout: 30000,
      validateStatus: () => true, // Don't throw on HTTP error status codes
    });

    console.log(`[API Proxy] Response ${response.status} for ${method} /${path}`);

    // Forward the response
    return NextResponse.json(response.data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        // Forward some response headers if they exist
        ...(response.headers['x-request-id'] && { 'X-Request-Id': response.headers['x-request-id'] }),
        ...(response.headers['x-error-handler'] && { 'X-Error-Handler': response.headers['x-error-handler'] }),
      },
    });

  } catch (error: any) {
    console.error('[API Proxy] Error:', {
      url: `${getBackendUrl()}/${params.slug.join('/')}`,
      method: req.method,
      message: error?.message,
      responseData: error?.response?.data,
      responseStatus: error?.response?.status,
    });

    // If it's an axios error with a response, return the backend's response
    if (error?.response) {
      return NextResponse.json(
        error.response.data || { message: 'Backend error' },
        { status: error.response.status }
      );
    }

    // For network errors or other issues
    return NextResponse.json(
      {
        message: 'Proxy error: Unable to connect to backend server',
        error: error?.message || 'Unknown error',
        backend_url: getBackendUrl(),
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
