"use client";

import useSWR from 'swr';
import Link from 'next/link';
import { apiClient } from '@/lib/api';

interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  brand?: string;
  image_url?: string;
  unit_id?: string;
  price_per_unit?: number;
}

interface ListResponse<T> {
  success?: boolean;
  data?: T[];
  items?: T[];
  total?: number;
}

const fetcher = async () => {
  // Support both {data: [...]} and bare array
  const data = await apiClient.products.list();
  const arr = (data as any)?.data ?? (data as any)?.items ?? data;
  return Array.isArray(arr) ? arr as Product[] : [] as Product[];
};

export default function ProductsIndexPage() {
  const { data, error, isLoading, mutate } = useSWR<Product[]>(['products:list'], fetcher);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold">Products</h1>
        <p className="mt-4 text-red-600">Failed to load products.</p>
        <button
          className="mt-4 px-4 py-2 rounded bg-primary-600 text-white"
          onClick={() => mutate()}
        >
          Retry
        </button>
      </div>
    );
  }

  const products = data || [];

  return (
    <div className="p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>
        <Link
          href="/products/new"
          className="inline-flex items-center rounded bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
        >
          Add product
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="mt-8 rounded border border-dashed p-12 text-center text-gray-600">
          No products yet. Click "Add product" to create one.
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <li key={p.id} className="rounded border p-4 hover:shadow">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-medium">{p.name}</h2>
                  <p className="text-sm text-gray-500">SKU: {p.sku}</p>
                </div>
                {typeof p.price === 'number' && (
                  <span className="text-right font-semibold">₹{p.price.toFixed(2)}</span>
                )}
              </div>
              {p.brand && <p className="mt-2 text-sm text-gray-600">Brand: {p.brand}</p>}
              <div className="mt-3">
                <Link
                  href={`/products/${p.id}`}
                  className="text-primary-600 hover:underline"
                >
                  View details
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
