import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_BACKEND = 'http://localhost:8080';

async function getBackendUrl() {
  const baseURL = (process.env.NEXT_PUBLIC_API_URL || DEFAULT_BACKEND).replace(/\/$/, '');
  return baseURL.endsWith('/api') ? baseURL : `${baseURL}/api`;
}

export async function GET() {
  try {
    const backendUrl = await getBackendUrl();
    const healthUrl = `${backendUrl}/health`;

    console.log(`[Health Proxy] Checking backend health at ${healthUrl}`);

    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          status: 'error',
          backend_url: backendUrl,
          error: `Backend responded with status ${response.status}`
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      ...data,
      backend_url: backendUrl,
      proxy_status: 'ok'
    });

  } catch (error: any) {
    console.error('[Health Proxy] Error:', error?.message);
    return NextResponse.json(
      {
        status: 'error',
        backend_url: await getBackendUrl(),
        error: error?.message || 'Unable to connect to backend',
        proxy_status: 'failed'
      },
      { status: 502 }
    );
  }
}