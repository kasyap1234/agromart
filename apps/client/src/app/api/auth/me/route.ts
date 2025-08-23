import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  try {
    const DEFAULT_BACKEND = 'http://localhost:8080';
    const baseURL = (process.env.NEXT_PUBLIC_API_URL || DEFAULT_BACKEND).replace(/\/$/, '');
    const url = baseURL.endsWith('/api')
      ? `${baseURL}/auth/me`
      : `${baseURL}/api/auth/me`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Forward authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await axios.get(url, {
      headers,
      timeout: 30000,
    });

    return NextResponse.json(response.data, { status: response.status || 200 });
  } catch (error: any) {
    const status = error?.response?.status ?? 500;
    const data = error?.response?.data ?? { message: 'Internal server error' };
    console.error('Me endpoint error:', error?.response?.data || error?.message || error);
    return NextResponse.json(data, { status });
  }
}