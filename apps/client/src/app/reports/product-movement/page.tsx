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
import { ArrowLeft, TrendingUp, TrendingDown, Package, Activity, Download, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';

interface ProductMovement {
  product_id: string;
  product_name: string;
  sku: string;
  movement_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  unit_price?: number;
  total_value?: number;
  reason: string;
  reference_id?: string;
  movement_date: string;
  created_by?: string;
  location?: string;
}

interface ProductMovementSummary {
  total_movements: number;
  total_inbound: number;
  total_outbound: number;
  net_movement: number;
  value_in: number;
  value_out: number;
  most_active_product: string;
}

interface ProductMovementReport {
  summary: ProductMovementSummary;
  movements: ProductMovement[];
  period: string;
  generated_at: string;
}

export default function ProductMovementReportPage() {
  const router = useRouter();
  const [period, setPeriod] = useState('30d'); // 7d, 30d, 90d, 1y
  const [movementType, setMovementType] = useState('all'); // all, in, out, adjustment

  const { data, error, isLoading, mutate } = useSWR(
    `reports/product-movement?period=${period}&type=${movementType}`,
    () => apiClient.reports.getProductMovement({ period, type: movementType })
  );

  const report = data as ProductMovementReport;

  const handleExport = async () => {
    try {
      const csvData = generateCSV(report?.movements || []);
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `product-movement-report-${period}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const generateCSV = (movements: ProductMovement[]) => {
    const headers = ['Date', 'Product', 'SKU', 'Type', 'Quantity', 'Unit Price', 'Total Value', 'Reason', 'Location'];
    const rows = movements.map(movement => [
      new Date(movement.movement_date).toLocaleDateString(),
      movement.product_name,
      movement.sku,
      movement.movement_type.toUpperCase(),
      movement.quantity.toString(),
      movement.unit_price?.toString() || '',
      movement.total_value?.toString() || '',
      movement.reason,
      movement.location || ''
    ]);
    
    return [headers, ...rows].map(row => 
      row.map(field => `"${field.replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  };

  const getMovementTypeIcon = (type: string) => {
    switch (type) {
      case 'in':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'out':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-blue-600" />;
    }
  };

  const getMovementTypeBadge = (type: string) => {
    switch (type) {
      case 'in':
        return <Badge className="bg-green-100 text-green-800">Inbound</Badge>;
      case 'out':
        return <Badge className="bg-red-100 text-red-800">Outbound</Badge>;
      case 'adjustment':
        return <Badge className="bg-blue-100 text-blue-800">Adjustment</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  if (error) {
    return (
      <DashboardLayout title="Product Movement Report">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Activity className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Error Loading Report</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {error.message || 'Failed to load product movement report'}
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
    <DashboardLayout title="Product Movement Report">
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
              <h1 className="text-2xl font-bold text-gray-900">Product Movement Report</h1>
              <p className="text-gray-600">
                Track inventory movements and stock flow analysis
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Select value={movementType} onValueChange={setMovementType}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="in">Inbound Only</SelectItem>
                <SelectItem value="out">Outbound Only</SelectItem>
                <SelectItem value="adjustment">Adjustments</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={!report?.movements?.length}
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
              <CardTitle className="text-sm font-medium">Total Movements</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {report?.summary?.total_movements || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Last {period === '7d' ? '7 days' : period === '30d' ? '30 days' : period === '90d' ? '90 days' : 'year'}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inbound</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-green-600">
                    {report?.summary?.total_inbound || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(report?.summary?.value_in || 0)} value
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outbound</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-red-600">
                    {report?.summary?.total_outbound || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(report?.summary?.value_out || 0)} value
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Movement</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className={`text-2xl font-bold ${
                    (report?.summary?.net_movement || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {report?.summary?.net_movement > 0 ? '+' : ''}{report?.summary?.net_movement || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Units net change
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Movement Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Product Movements
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : report?.movements?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.movements.map((movement, index) => (
                    <TableRow key={`${movement.product_id}-${index}`}>
                      <TableCell className="text-sm">
                        {new Date(movement.movement_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium">
                        {movement.product_name}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {movement.sku}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getMovementTypeIcon(movement.movement_type)}
                          {getMovementTypeBadge(movement.movement_type)}
                        </div>
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${
                        movement.movement_type === 'in' ? 'text-green-600' : 
                        movement.movement_type === 'out' ? 'text-red-600' : 
                        'text-blue-600'
                      }`}>
                        {movement.movement_type === 'in' ? '+' : movement.movement_type === 'out' ? '-' : ''}
                        {movement.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {movement.unit_price ? formatCurrency(movement.unit_price) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {movement.total_value ? formatCurrency(movement.total_value) : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {movement.reason}
                      </TableCell>
                      <TableCell>
                        {movement.location && (
                          <Badge variant="outline">{movement.location}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Activity className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No Movements Found</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  No product movements found for the selected period and filters.
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
                {report.most_active_product && (
                  <>
                    <span className="mx-2">•</span>
                    Most active product: <span className="font-medium">{report.summary.most_active_product}</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}