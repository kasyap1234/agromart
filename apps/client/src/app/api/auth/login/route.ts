import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const DEFAULT_BACKEND = 'http://localhost:8080';
    const baseURL = (process.env.NEXT_PUBLIC_API_URL || DEFAULT_BACKEND).replace(/\/$/, '');
    const url = baseURL.endsWith('/api') ? `${baseURL}/auth/login` : `${baseURL}/api/auth/login`;

    const body = await request.json();

    const response = await axios.post(url, body, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });

    return NextResponse.json(response.data, { status: response.status || 200 });
  } catch (error: any) {
    const status = error?.response?.status ?? 500;
    const data = error?.response?.data ?? { message: 'Internal server error' };
    console.error('Login error:', error?.response?.data || error?.message || error);
    return NextResponse.json(data, { status });
  }
}