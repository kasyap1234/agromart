import { NextApiRequest, NextApiResponse } from 'next';
import { apiClient } from '@/lib/api';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Method not allowed' });
    }

    const response = await apiClient.post('/api/auth/login', req.body);
    return res.status(200).json(response);
  } catch (error) {
    console.error('Login error:', error);
    return res.status(401).json({ message: 'Invalid credentials' });
  }
}