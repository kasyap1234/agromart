"use client";

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { apiClient } from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Loader2, 
  ArrowLeft, 
  Edit, 
  ShoppingCart, 
  Calendar, 
  DollarSign, 
  User, 
  CheckCircle2,
  XCircle,
  Clock,
  Truck,
  Download
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format, parseISO } from 'date-fns';

// Types following TypeScript best practices
interface SalesOrder {
  id: string;
  so_number: string;
  customer_id: string;
  customer_name?: string;
  location_id?: string;
  location_name?: string;
  status: 'draft' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  total_amount: number;
  expected_delivery_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  items: SalesOrderItem[];
}

interface SalesOrderItem {
  id: string;
  product_id: string;
  product_name?: string;
  product_sku?: string;
  batch_id?: string;
  batch_number?: string;
  quantity_ordered: number;
  quantity_shipped?: number;
  unit_price: number;
  tax_percent?: number;
  discount_percent?: number;
  total_price: number;
  notes?: string;
}

// Constants moved outside component for performance
const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'secondary' as const, icon: Clock },
  confirmed: { label: 'Confirmed', color: 'default' as const, icon: CheckCircle2 },
  shipped: { label: 'Shipped', color: 'default' as const, icon: Truck },
  delivered: { label: 'Delivered', color: 'default' as const, icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'destructive' as const, icon: XCircle },
} as const;

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

export default function SalesOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');

  // Data fetching with SWR following Next.js best practices
  const { data: order, isLoading, error, mutate } = useSWR(
    orderId ? `sales-order:${orderId}` : null,
    () => apiClient.sales.orders.get(orderId),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  // Event handlers following React best practices
  const handleEdit = useCallback(() => {
    router.push(`/sales-orders/${orderId}/edit`);
  }, [router, orderId]);

  const handleStatusUpdate = useCallback(async () => {
    if (!newStatus) return;

    setUpdatingStatus(true);
    try {
      await apiClient.sales.orders.updateStatus(orderId, newStatus);
      toast.success('Sales order status updated successfully');
      await mutate(); // Revalidate data
      setShowStatusDialog(false);
    } catch (error: any) {
      console.error('Error updating status:', error);
      const message = error?.response?.data?.message || error?.message || 'Failed to update status';
      toast.error(message);
    } finally {
      setUpdatingStatus(false);
    }
  }, [orderId, newStatus, mutate]);

  const handleShip = useCallback(() => {
    router.push(`/sales-orders/${orderId}/ship`);
  }, [router, orderId]);

  const handleExport = useCallback(() => {
    window.open(`/api/sales/orders/${orderId}/export`, '_blank');
  }, [orderId]);

  const handleGoBack = useCallback(() => {
    router.push('/sales-orders');
  }, [router]);

  // Loading state
  if (isLoading) {
    return (
      <DashboardLayout title="Sales Order Details">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  // Error state
  if (error || !order) {
    return (
      <DashboardLayout title="Sales Order Details">
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">Failed to load sales order details</p>
          <Button onClick={handleGoBack} variant="outline">
            Back to Sales Orders
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const orderData = order?.data || order;
  const statusConfig = STATUS_CONFIG[orderData.status];
  const StatusIcon = statusConfig.icon;

  return (
    <DashboardLayout title={`SO ${orderData.so_number}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleGoBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Sales Orders
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <ShoppingCart className="h-6 w-6" />
                Sales Order {orderData.so_number}
              </h1>
              <p className="text-gray-600">
                View and manage sales order details
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Update Status
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Update Sales Order Status</DialogTitle>
                  <DialogDescription>
                    Change the status of this sales order.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Select onValueChange={setNewStatus} value={newStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select new status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem 
                          key={status.value} 
                          value={status.value}
                          disabled={status.value === orderData.status}
                        >
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowStatusDialog(false)}
                    disabled={updatingStatus}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleStatusUpdate}
                    disabled={!newStatus || updatingStatus}
                  >
                    {updatingStatus ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Update Status
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button onClick={handleEdit} className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Edit Order
            </Button>
            {orderData.status === 'confirmed' && (
              <Button onClick={handleShip} className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Ship Items
              </Button>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <Badge variant={statusConfig.color} className="flex items-center gap-1">
            <StatusIcon className="h-3 w-3" />
            {statusConfig.label}
          </Badge>
        </div>

        {/* Order Information */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Order Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">SO Number</label>
                <p className="text-lg font-semibold">{orderData.so_number}</p>
              </div>
              
              <Separator />
              
              <div>
                <label className="text-sm font-medium text-gray-500">Customer</label>
                <p className="text-lg">{orderData.customer_name || 'N/A'}</p>
              </div>
              
              <Separator />
              
              <div>
                <label className="text-sm font-medium text-gray-500">Total Amount</label>
                <p className="text-lg font-semibold flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  {(orderData.total_amount / 100).toFixed(2)}
                </p>
              </div>

              {orderData.location_name && (
                <>
                  <Separator />
                  <div>
                    <label className="text-sm font-medium text-gray-500">Location</label>
                    <p className="text-lg">{orderData.location_name}</p>
                  </div>
                </>
              )}

              {orderData.expected_delivery_date && (
                <>
                  <Separator />
                  <div>
                    <label className="text-sm font-medium text-gray-500">Expected Delivery</label>
                    <p className="text-lg flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(parseISO(orderData.expected_delivery_date), 'PPP')}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Timeline Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Created At</label>
                <p className="text-lg">
                  {format(parseISO(orderData.created_at), 'PPp')}
                </p>
              </div>
              
              <Separator />
              
              <div>
                <label className="text-sm font-medium text-gray-500">Last Updated</label>
                <p className="text-lg">
                  {orderData.updated_at ? format(parseISO(orderData.updated_at), 'PPp') : 'Never'}
                </p>
              </div>

              {orderData.created_by && (
                <>
                  <Separator />
                  <div>
                    <label className="text-sm font-medium text-gray-500">Created By</label>
                    <p className="text-lg flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {orderData.created_by}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Order Items */}
        <Card>
          <CardHeader>
            <CardTitle>Order Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead className="text-right">Ordered</TableHead>
                  <TableHead className="text-right">Shipped</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderData.items?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.product_name || 'Unknown Product'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {item.product_sku || 'N/A'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {item.batch_number || 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.quantity_ordered}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.quantity_shipped || 0}
                    </TableCell>
                    <TableCell className="text-right">
                      ${(item.unit_price / 100).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${(item.total_price / 100).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Notes */}
        {orderData.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm bg-gray-50 p-3 rounded-md">
                {orderData.notes}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Related Operations */}
        <Card>
          <CardHeader>
            <CardTitle>Related Operations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => router.push(`/inventory?so_id=${orderId}`)}
              >
                View Inventory Changes
              </Button>
              <Button 
                variant="outline" 
                onClick={() => router.push(`/customers/${orderData.customer_id}`)}
              >
                View Customer Details
              </Button>
              {orderData.location_id && (
                <Button 
                  variant="outline" 
                  onClick={() => router.push(`/locations/${orderData.location_id}`)}
                >
                  View Location Details
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}