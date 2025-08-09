"use client";

import useSWR from 'swr';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { apiClient } from '@/lib/api';

export default function ExpiringBatchesReportPage() {
  const { data, error, isLoading } = useSWR(['/reports/expiring-batches'], () => apiClient.reports.expiringBatches(30));
  const items = (data as any)?.data ?? data ?? [];

  return (
    <DashboardLayout title="Expiring Batches (30 days)">
      {isLoading && <div className="py-8">Loading...</div>}
      {error && <div className="py-8 text-red-600">Failed to load expiring batches.</div>}
      {!isLoading && !error && (
        Array.isArray(items) && items.length > 0 ? (
          <ul className="space-y-3">
            {items.map((it: any, idx: number) => (
              <li key={idx} className="rounded border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{it.product_name}</p>
                    <p className="text-sm text-neutral-500">Batch: {it.batch_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-warning-600">{it.days_until_expiry} days</p>
                    <p className="text-xs text-neutral-500">{it.quantity} units</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-8 rounded border border-dashed p-12 text-center text-gray-600">
            No expiring batches.
          </div>
        )
      )}
    </DashboardLayout>
  );
}
