"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { DataTable, Column } from '@/components/common/DataTable';
import { apiClient } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { 
  ShoppingCart, 
  Plus, 
  Eye, 
  Edit, 
  MoreHorizontal, 
  Search, 
  Filter,
  TrendingUp,
  Package,
  DollarSign,
  Calendar
} from 'lucide-react';

interface SalesOrder {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  customer_email?: string;
  status: 'draft' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total_amount: number;
  items_count: number;
  order_date: string;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

interface SalesOrderStats {
  total_orders: number;
  total_value: number;
  pending_orders: number;
  delivered_orders: number;
  average_order_value: number;
}

interface SalesOrdersResponse {
  sales_orders: SalesOrder[];
  stats: SalesOrderStats;
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export default function SalesOrdersPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data, error, isLoading, mutate } = useSWR(
    `sales-orders:list:${page}:${limit}:${search}:${statusFilter}:${sortBy}:${sortOrder}`,
    async () => {
      const params: any = {
        page,
        limit,
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;

      return await apiClient.salesOrders.list(params);
    },
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
    }
  );

  const salesOrdersData = data as SalesOrdersResponse;
  const salesOrders = salesOrdersData?.sales_orders || [];
  const stats = salesOrdersData?.stats;

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: 'Draft', variant: 'secondary' as const },
      confirmed: { label: 'Confirmed', variant: 'default' as const },
      processing: { label: 'Processing', variant: 'default' as const },
      shipped: { label: 'Shipped', variant: 'default' as const },
      delivered: { label: 'Delivered', variant: 'default' as const },
      cancelled: { label: 'Cancelled', variant: 'destructive' as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await apiClient.salesOrders.updateStatus(orderId, newStatus);
      toast.success('Order status updated successfully');
      mutate();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update order status');
    }
  };

  const columns: Column<SalesOrder>[] = [
    {
      header: 'Order',
      accessorKey: 'order_number',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.order_number}</div>
          <div className="text-sm text-muted-foreground">
            {new Date(row.order_date).toLocaleDateString()}
          </div>
        </div>
      ),
    },
    {
      header: 'Customer',
      accessorKey: 'customer_name',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.customer_name}</div>
          {row.customer_email && (
            <div className="text-sm text-muted-foreground">{row.customer_email}</div>
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ row }) => getStatusBadge(row.status),
    },
    {
      header: 'Items',
      accessorKey: 'items_count',
      cell: ({ row }) => (
        <span className="font-medium">{row.items_count}</span>
      ),
    },
    {
      header: 'Total Amount',
      accessorKey: 'total_amount',
      cell: ({ row }) => (
        <span className="font-semibold">{formatCurrency(row.total_amount)}</span>
      ),
    },
    {
      header: 'Expected Delivery',
      accessorKey: 'expected_delivery_date',
      cell: ({ row }) => (
        row.expected_delivery_date ? 
          new Date(row.expected_delivery_date).toLocaleDateString() : 
          '-'
      ),
    },
    {
      header: 'Actions',
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/sales-orders/${row.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/sales-orders/${row.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Order
              </Link>
            </DropdownMenuItem>
            {row.status === 'confirmed' && (
              <DropdownMenuItem 
                onClick={() => handleStatusChange(row.id, 'processing')}
              >
                Start Processing
              </DropdownMenuItem>
            )}
            {row.status === 'processing' && (
              <DropdownMenuItem 
                onClick={() => handleStatusChange(row.id, 'shipped')}
              >
                Mark as Shipped
              </DropdownMenuItem>
            )}
            {row.status === 'shipped' && (
              <DropdownMenuItem 
                onClick={() => handleStatusChange(row.id, 'delivered')}
              >
                Mark as Delivered
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  if (error) {
    return (
      <DashboardLayout title="Sales Orders">
        <EmptyState 
          icon={ShoppingCart}
          title="Error Loading Sales Orders"
          description={error.message || 'Failed to load sales orders'}
          action={
            <Button onClick={() => mutate()}>
              Try Again
            </Button>
          }
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Sales Orders">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats?.total_orders || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.pending_orders || 0} pending
                  </p>
                </>
              )}
            </CardContent>
          </Card>

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
                    {formatCurrency(stats?.total_value || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.delivered_orders || 0} delivered
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Order</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {formatCurrency(stats?.average_order_value || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    per order
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {stats?.total_orders ? 
                      Math.round((stats.delivered_orders / stats.total_orders) * 100) : 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    completion rate
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Sales Orders
              </CardTitle>
              <Button asChild>
                <Link href="/sales-orders/new">
                  <Plus className="mr-2 h-4 w-4" />
                  New Sales Order
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search orders..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DataTable
              data={salesOrders}
              columns={columns}
              loading={isLoading}
              error={error}
              pagination={{
                page,
                limit,
                total: salesOrdersData?.total || 0,
                totalPages: salesOrdersData?.total_pages || 0,
              }}
              onPageChange={setPage}
              onLimitChange={setLimit}
              emptyMessage="No sales orders found"
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}