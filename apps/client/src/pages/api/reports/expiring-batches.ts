import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ message: 'Method not allowed' });
    }

    const DEFAULT_BACKEND = 'http://localhost:8080';
    const baseURL = (process.env.NEXT_PUBLIC_API_URL || DEFAULT_BACKEND).replace(/\/$/, '');
    const url = baseURL.endsWith('/api')
      ? `${baseURL}/reports/expiring-batches`
      : `${baseURL}/api/reports/expiring-batches`;

    // Forward query parameters (like days)
    const queryParams = new URLSearchParams();
    if (req.query.days) {
      queryParams.append('days', String(req.query.days));
    }

    const fullUrl = queryParams.toString() ? `${url}?${queryParams.toString()}` : url;

    const response = await axios.get(fullUrl, {
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.authorization && { Authorization: req.headers.authorization }),
      },
      timeout: 30000,
    });

    res.status(response.status).json(response.data);
  } catch (error: any) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      console.error('Expiring batches API error:', error.message);
      res.status(500).json({
        success: false,
        error: {
          code: 500,
          message: 'Failed to fetch expiring batches report'
        }
      });
    }
  }
}
