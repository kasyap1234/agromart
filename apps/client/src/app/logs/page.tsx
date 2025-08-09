"use client";

import useSWR from 'swr';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { apiClient } from '@/lib/api';

export default function LogsPage() {
  const { data, error, isLoading } = useSWR(['/inventory/logs'], () => apiClient.inventory.getLogs());
  const items = (data as any)?.data ?? data ?? [];

  return (
    <DashboardLayout title="Inventory Logs">
      {isLoading && <div className="py-8">Loading...</div>}
      {error && <div className="py-8 text-red-600">Failed to load logs.</div>}
      {!isLoading && !error && (
        Array.isArray(items) && items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-neutral-600">Product</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-neutral-600">Batch</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-neutral-600">Change</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-neutral-600">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {items.map((it: any, idx: number) => (
                  <tr key={idx}>
                    <td className="px-4 py-2">{it.product_name || it.product_id}</td>
                    <td className="px-4 py-2">{it.batch_number || it.batch_id}</td>
                    <td className="px-4 py-2">{it.quantity_change ?? it.quantity}</td>
                    <td className="px-4 py-2">{it.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-8 rounded border border-dashed p-12 text-center text-gray-600">
            No logs found.
          </div>
        )
      )}
    </DashboardLayout>
  );
}
