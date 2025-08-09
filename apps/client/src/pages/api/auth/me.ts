import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ message: 'Method not allowed' });
    }

    const DEFAULT_BACKEND = 'http://localhost:8080';
    const baseURL = (process.env.NEXT_PUBLIC_API_URL || DEFAULT_BACKEND).replace(/\/$/, '');
    const url = baseURL.endsWith('/api') 
      ? `${baseURL}/auth/me` 
      : `${baseURL}/api/auth/me`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Forward authorization header
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
    }

    const response = await axios.get(url, {
      headers,
      timeout: 30000,
    });
    
    return res.status(response.status || 200).json(response.data);
  } catch (error: any) {
    const status = error?.response?.status ?? 500;
    const data = error?.response?.data ?? { message: 'Internal server error' };
    console.error('Me endpoint error:', error?.response?.data || error?.message || error);
    return res.status(status).json(data);
  }
}