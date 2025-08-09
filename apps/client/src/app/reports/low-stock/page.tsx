"use client";

import useSWR from 'swr';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { apiClient } from '@/lib/api';

export default function LowStockReportPage() {
  const { data, error, isLoading } = useSWR(['/reports/low-stock'], () => apiClient.reports.lowStock(10));
  const items = (data as any)?.data ?? data ?? [];

  return (
    <DashboardLayout title="Low Stock Report">
      {isLoading && <div className="py-8">Loading...</div>}
      {error && <div className="py-8 text-red-600">Failed to load low stock report.</div>}
      {!isLoading && !error && (
        Array.isArray(items) && items.length > 0 ? (
          <ul className="space-y-3">
            {items.map((it: any, idx: number) => (
              <li key={idx} className="rounded border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{it.product_name}</p>
                    <p className="text-sm text-neutral-500">SKU: {it.product_sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-error-600">{it.current_quantity} units</p>
                    <p className="text-xs text-neutral-500">Min: {it.min_stock_level}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-8 rounded border border-dashed p-12 text-center text-gray-600">
            No low stock items.
          </div>
        )
      )}
    </DashboardLayout>
  );
}
