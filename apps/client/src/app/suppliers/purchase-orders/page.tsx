"use client";

import useSWR from 'swr';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { apiClient } from '@/lib/api';
import { useState, useMemo } from 'react';
import { formatDate } from '@/lib/date';

interface PurchaseOrder {
  id: string;
  supplier_id: string;
  supplier_name: string;
  status: 'pending' | 'received' | 'cancelled';
  total_amount: number;
  created_at: string;
  expected_delivery_date?: string;
  items: PurchaseOrderItem[];
}

interface PurchaseOrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  received: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const STATUS_LABELS = {
  pending: 'Pending',
  received: 'Received',
  cancelled: 'Cancelled',
};

export default function SupplierPurchaseOrdersPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data, error, isLoading, mutate } = useSWR(
    ['supplier-purchase-orders', page, limit, statusFilter],
    () => {
      const params: any = { page, limit };
      if (statusFilter) params.status = statusFilter;
      return apiClient.purchaseOrders.list(params);
    },
    { 
      keepPreviousData: true,
      revalidateOnFocus: false
    }
  );

  const purchaseOrders = useMemo(() => {
    if (!data) return [];
    return (data as any)?.data ?? data ?? [];
  }, [data]);

  const hasNextPage = purchaseOrders.length === limit;
  const hasPrevPage = page > 1;

  if (error) {
    return (
      <DashboardLayout title="Supplier Purchase Orders">
        <div className="p-4 rounded bg-error-50 text-error-700">
          Failed to load purchase orders. 
          <button className="underline ml-2" onClick={() => mutate()}>
            Retry
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Supplier Purchase Orders">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Purchase Orders</h1>
        <Button asChild>
          <Link href={"/purchase-orders/new" as any}>Create PO</Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="mt-6 bg-white rounded-lg border border-neutral-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="input"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
          <div className="flex space-x-2">
            <Button
              onClick={() => {
                setStatusFilter('');
                setPage(1);
              }}
              variant="outline"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="mt-6 min-h-[200px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      )}

      {!isLoading && purchaseOrders.length === 0 ? (
        <div className="mt-8 rounded border border-dashed p-12 text-center text-gray-600">
          No purchase orders found.
        </div>
      ) : (
        !isLoading && (
          <>
            {/* Purchase Orders List */}
            <div className="mt-6 overflow-hidden rounded-lg border border-neutral-200">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      PO Number
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Supplier
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {purchaseOrders.map((po: PurchaseOrder) => (
                    <tr key={po.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-neutral-900">PO-{po.id.slice(0, 8)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-neutral-900">{po.supplier_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-neutral-500">
                          {formatDate(po.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[po.status]}`}>
                          {STATUS_LABELS[po.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-neutral-900">
                          ₹{po.total_amount?.toFixed(2) || '0.00'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link 
                          href={`/purchase-orders/${po.id}` as any}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-sm text-neutral-700 mr-3">Rows per page:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="input w-20"
                >
                  {[10, 20, 50].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex space-x-2">
                <Button
                  onClick={() => setPage(page - 1)}
                  disabled={!hasPrevPage}
                  variant="outline"
                >
                  Previous
                </Button>
                <Button
                  onClick={() => setPage(page + 1)}
                  disabled={!hasNextPage}
                  variant="outline"
                >
                  Next
                </Button>
              </div>
              
              <div className="text-sm text-neutral-700">
                Page {page}
              </div>
            </div>
          </>
        )
      )}
    </DashboardLayout>
  );
}