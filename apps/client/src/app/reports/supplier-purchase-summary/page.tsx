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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiClient } from '@/lib/api';
import { ArrowLeft, TrendingUp, Package, Users, ShoppingCart, Download, Calendar, Building } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';

interface SupplierPurchaseSummary {
  supplier_id: string;
  supplier_name: string;
  supplier_email?: string;
  supplier_phone?: string;
  total_orders: number;
  total_amount: number;
  average_order_value: number;
  last_order_date?: string;
  payment_terms?: string;
  status: 'active' | 'inactive';
  top_products: Array<{
    product_name: string;
    quantity_ordered: number;
    total_value: number;
  }>;
}

interface SupplierReportSummary {
  total_suppliers: number;
  active_suppliers: number;
  total_purchase_value: number;
  average_supplier_value: number;
  top_supplier: string;
  period: string;
}

interface SupplierPurchaseReport {
  summary: SupplierReportSummary;
  suppliers: SupplierPurchaseSummary[];
  generated_at: string;
}

export default function SupplierPurchaseSummaryPage() {
  const router = useRouter();
  const [period, setPeriod] = useState('90d'); // 30d, 90d, 180d, 1y
  const [sortBy, setSortBy] = useState('total_amount'); // total_amount, total_orders, average_order_value

  const { data, error, isLoading, mutate } = useSWR(
    `reports/supplier-purchase-summary?period=${period}&sortBy=${sortBy}`,
    () => apiClient.reports.getSupplierPurchaseSummary({ period, sortBy })
  );

  const report = data as SupplierPurchaseReport;

  const handleExport = async () => {
    try {
      const csvData = generateCSV(report?.suppliers || []);
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `supplier-purchase-summary-${period}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const generateCSV = (suppliers: SupplierPurchaseSummary[]) => {
    const headers = [
      'Supplier Name', 
      'Email', 
      'Phone', 
      'Total Orders', 
      'Total Amount', 
      'Average Order Value', 
      'Last Order Date',
      'Payment Terms',
      'Status',
      'Top Product'
    ];
    const rows = suppliers.map(supplier => [
      supplier.supplier_name,
      supplier.supplier_email || '',
      supplier.supplier_phone || '',
      supplier.total_orders.toString(),
      supplier.total_amount.toString(),
      supplier.average_order_value.toString(),
      supplier.last_order_date ? new Date(supplier.last_order_date).toLocaleDateString() : '',
      supplier.payment_terms || '',
      supplier.status,
      supplier.top_products?.[0]?.product_name || ''
    ]);
    
    return [headers, ...rows].map(row => 
      row.map(field => `"${field.replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  };

  const getSupplierStatusBadge = (status: string) => {
    return status === 'active' ? (
      <Badge className="bg-green-100 text-green-800">Active</Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>
    );
  };

  if (error) {
    return (
      <DashboardLayout title="Supplier Purchase Summary">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Building className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Error Loading Report</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {error.message || 'Failed to load supplier purchase summary'}
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
    <DashboardLayout title="Supplier Purchase Summary">
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
              <h1 className="text-2xl font-bold text-gray-900">Supplier Purchase Summary</h1>
              <p className="text-gray-600">
                Analyze purchase patterns and supplier performance
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="180d">Last 6 months</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="total_amount">By Total Amount</SelectItem>
                <SelectItem value="total_orders">By Order Count</SelectItem>
                <SelectItem value="average_order_value">By Avg Order Value</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={!report?.suppliers?.length}
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
              <CardTitle className="text-sm font-medium">Total Suppliers</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {report?.summary?.total_suppliers || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {report?.summary?.active_suppliers || 0} active
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {formatCurrency(report?.summary?.total_purchase_value || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Last {period === '30d' ? '30 days' : period === '90d' ? '90 days' : period === '180d' ? '6 months' : 'year'}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg per Supplier</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {formatCurrency(report?.summary?.average_supplier_value || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Average purchase value
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Supplier</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className="text-lg font-bold truncate">
                    {report?.summary?.top_supplier || 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Highest value partner
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Suppliers Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Supplier Purchase Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : report?.suppliers?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead className="text-right">Avg Order Value</TableHead>
                    <TableHead>Last Order</TableHead>
                    <TableHead>Top Product</TableHead>
                    <TableHead>Payment Terms</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.suppliers.map((supplier) => (
                    <TableRow key={supplier.supplier_id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{supplier.supplier_name}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {supplier.supplier_email && (
                            <div>{supplier.supplier_email}</div>
                          )}
                          {supplier.supplier_phone && (
                            <div className="text-muted-foreground">{supplier.supplier_phone}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {supplier.total_orders}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(supplier.total_amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(supplier.average_order_value)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {supplier.last_order_date ? 
                          new Date(supplier.last_order_date).toLocaleDateString() : 
                          'No orders'
                        }
                      </TableCell>
                      <TableCell>
                        {supplier.top_products?.[0] ? (
                          <div className="text-sm">
                            <div className="font-medium">{supplier.top_products[0].product_name}</div>
                            <div className="text-muted-foreground">
                              {supplier.top_products[0].quantity_ordered} units • {formatCurrency(supplier.top_products[0].total_value)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {supplier.payment_terms ? (
                          <Badge variant="outline">{supplier.payment_terms}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getSupplierStatusBadge(supplier.status)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Building className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No Supplier Data</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  No supplier purchase data found for the selected period.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Report Metadata */}
        {report?.generated_at && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Report generated on {new Date(report.generated_at).toLocaleString()}
                <span className="mx-2">•</span>
                Period: {period === '30d' ? 'Last 30 days' : period === '90d' ? 'Last 90 days' : period === '180d' ? 'Last 6 months' : 'Last year'}
                <span className="mx-2">•</span>
                Sorted by: {sortBy.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}