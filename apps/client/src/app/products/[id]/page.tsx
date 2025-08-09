"use client";

import { useParams } from 'next/navigation';
import useSWR from 'swr';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { apiClient } from '@/lib/api';

export default function ProductDetailsPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params?.id[0] : (params as any)?.id;
  const { data, error, isLoading } = useSWR(id ? [`/products/${id}`] : null, () => apiClient.products.get(String(id)));

  if (!id) return null;

  return (
    <DashboardLayout title="Product Details">
      {isLoading && (
        <div className="py-8">Loading...</div>
      )}
      {error && (
        <div className="py-8 text-red-600">Failed to load product.</div>
      )}
      {data && (
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">{(data as any)?.data?.name || (data as any)?.name}</h1>
          <p className="text-sm text-neutral-600">SKU: {(data as any)?.data?.sku || (data as any)?.sku}</p>
          {typeof ((data as any)?.data?.price ?? (data as any)?.price) === 'number' && (
            <p className="font-medium">₹{(((data as any)?.data?.price ?? (data as any)?.price) as number).toFixed(2)}</p>
          )}
          {(data as any)?.data?.brand && <p>Brand: {(data as any)?.data?.brand}</p>}
          {(data as any)?.data?.description && <p className="text-neutral-700">{(data as any)?.data?.description}</p>}
        </div>
      )}
    </DashboardLayout>
  );
}
