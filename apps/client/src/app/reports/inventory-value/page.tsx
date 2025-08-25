"use client";

import { useState } from 'react';
import useSWR from 'swr';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api';
import { ArrowLeft, DollarSign, TrendingUp, Package, BarChart3, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';

interface InventoryValueItem {
  product_id: string;
  product_name: string;
  sku: string;
  current_stock: number;
  unit_cost: number;
  total_value: number;
  category?: string;
  location?: string;
}

interface InventoryValueSummary {
  total_items: number;
  total_value: number;
  average_value_per_item: number;
  low_stock_items: number;
  high_value_items: number;
}

interface InventoryValueReport {
  summary: InventoryValueSummary;
  items: InventoryValueItem[];
  generated_at: string;
}

export default function InventoryValueReportPage() {
  const router = useRouter();
  const [dateRange, setDateRange] = useState('current'); // current, 30d, 90d, 1y

  const { data, error, isLoading, mutate } = useSWR(
    `reports/inventory-value?range=${dateRange}`,
    () => apiClient.reports.getInventoryValue({ range: dateRange })
  );

  const report = data as InventoryValueReport;

  const handleExport = async () => {
    try {
      // Generate CSV export
      const csvData = generateCSV(report?.items || []);
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory-value-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const generateCSV = (items: InventoryValueItem[]) => {
    const headers = ['Product Name', 'SKU', 'Current Stock', 'Unit Cost', 'Total Value', 'Category', 'Location'];
    const rows = items.map(item => [
      item.product_name,
      item.sku,
      item.current_stock.toString(),
      item.unit_cost.toString(),
      item.total_value.toString(),
      item.category || '',
      item.location || ''
    ]);
    
    return [headers, ...rows].map(row => 
      row.map(field => `"${field.replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  };

  if (error) {
    return (
      <DashboardLayout title="Inventory Value Report">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Package className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Error Loading Report</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {error.message || 'Failed to load inventory value report'}
              </p>
              <Button onClick={() => mutate()} className="mt-4">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Inventory Value Report">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push('/reports')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Reports
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Inventory Value Report</h1>
              <p className="text-gray-600">
                Complete inventory valuation and stock analysis
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={!report?.items?.length}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {formatCurrency(report?.summary?.total_value || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Across {report?.summary?.total_items || 0} items
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {formatCurrency(report?.summary?.average_value_per_item || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Per inventory item
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-amber-600">
                    {report?.summary?.low_stock_items || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Need attention
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Value Items</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-green-600">
                    {report?.summary?.high_value_items || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Premium products
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Inventory Value Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Inventory Items by Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : report?.items?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.items.map((item) => (
                    <TableRow key={item.product_id}>
                      <TableCell className="font-medium">
                        {item.product_name}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {item.sku}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.current_stock}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.unit_cost)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(item.total_value)}
                      </TableCell>
                      <TableCell>
                        {item.category && (
                          <Badge variant="secondary">{item.category}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.current_stock <= 10 ? (
                          <Badge variant="destructive">Low Stock</Badge>
                        ) : item.total_value > 1000 ? (
                          <Badge variant="default">High Value</Badge>
                        ) : (
                          <Badge variant="secondary">Normal</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No Inventory Data</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  No inventory items found for the selected period.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Report Metadata */}
        {report?.generated_at && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                Report generated on {new Date(report.generated_at).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}