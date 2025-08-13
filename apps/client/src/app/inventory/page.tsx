"use client";

import useSWR from 'swr';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { apiClient } from '@/lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Package } from 'lucide-react';
import { InventoryDetails } from '@/types';

export default function InventoryPage() {
  const { data, error, isLoading } = useSWR(['/inventory'], () => apiClient.inventory.list());
  const items: InventoryDetails[] = Array.isArray(data) ? data : data?.data || [];

  return (
    <DashboardLayout title="Inventory">
      {isLoading && <div className="py-8">Loading...</div>}
      {error && <div className="py-8 text-red-600">Failed to load inventory.</div>}
      {!isLoading && !error && (
        items.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Quantity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item: InventoryDetails) => (
                  <TableRow key={item.product_id + '-' + item.batch_id}>
                    <TableCell className="font-medium">
                      <div>{item.product_name}</div>
                      <div className="text-sm text-muted-foreground">
                        SKU: {item.product_sku}
                      </div>
                    </TableCell>
                    <TableCell>{item.batch_number}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <Card className="mt-8">
            <CardContent className="p-12 text-center">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                No inventory records found.
              </p>
            </CardContent>
          </Card>
        )
      )}
    </DashboardLayout>
  );
}
