import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchProducts } from '@/lib/api';

/**
 * Server‑less API route that proxies the external product list.
 *
 * Only `GET` is supported – other methods receive a 405 response.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { data, status } = await fetchProducts();
    return res.status(status).json(data);
  } catch (error) {
    console.error('Error fetching products:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}