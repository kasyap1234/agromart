"use client";

import useSWR from 'swr';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { apiClient } from '@/lib/api';
import { Package } from 'lucide-react';
import { InventoryDetails } from '@/types';
import { DataTable, Column } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';

export default function InventoryPage() {
  const { data, error, isLoading } = useSWR(['/inventory'], () => apiClient.inventory.list());
  const items: InventoryDetails[] = Array.isArray(data) ? data : data?.data || [];

  const columns: Column<InventoryDetails>[] = [
    {
      key: 'product_name',
      header: 'Product',
      cell: (item) => (
        <div>
          <div className="font-medium">{item.product_name}</div>
          <div className="text-sm text-muted-foreground">
            SKU: {item.product_sku}
          </div>
        </div>
      ),
    },
    {
      key: 'batch_number',
      header: 'Batch',
      cell: (item) => item.batch_number,
    },
    {
      key: 'quantity',
      header: 'Quantity',
      cell: (item) => `${item.quantity} units`,
    },
    {
      key: 'total_value',
      header: 'Value',
      className: 'text-right',
      cell: (item) => `₹${item.total_value?.toFixed(2) || '0.00'}`,
    },
  ];

  const emptyState = (
    <EmptyState
      icon={<Package className="w-12 h-12 text-muted-foreground" />}
      title="No inventory records found"
      description="Start tracking your inventory by adding products and batches."
    />
  );

  return (
    <DashboardLayout title="Inventory">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground">Track your product inventory levels</p>
        </div>

        <DataTable
          data={items}
          columns={columns}
          loading={isLoading}
          error={error ? "Failed to load inventory" : undefined}
          searchable
          searchPlaceholder="Search inventory by product name or SKU"
          emptyState={emptyState}
        />
      </div>
    </DashboardLayout>
  );
}