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
  Package, 
  Calendar, 
  DollarSign, 
  User, 
  CheckCircle2,
  XCircle,
  Clock,
  Download
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format, parseISO } from 'date-fns';

// Types following TypeScript best practices
interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  supplier_name?: string;
  status: 'pending' | 'approved' | 'received' | 'cancelled';
  total_amount: number;
  expected_delivery_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  items: PurchaseOrderItem[];
}

interface PurchaseOrderItem {
  id: string;
  product_id: string;
  product_name?: string;
  product_sku?: string;
  quantity_ordered: number;
  quantity_received?: number;
  unit_price: number;
  total_price: number;
  notes?: string;
}

// Constants moved outside component for performance
const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'secondary' as const, icon: Clock },
  approved: { label: 'Approved', color: 'default' as const, icon: CheckCircle2 },
  received: { label: 'Received', color: 'default' as const, icon: Package },
  cancelled: { label: 'Cancelled', color: 'destructive' as const, icon: XCircle },
} as const;

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'received', label: 'Received' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');

  // Data fetching with SWR following Next.js best practices
  const { data: order, isLoading, error, mutate } = useSWR(
    orderId ? `purchase-order:${orderId}` : null,
    () => apiClient.purchaseOrders.get(orderId),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  // Event handlers following React best practices
  const handleEdit = useCallback(() => {
    router.push(`/purchase-orders/${orderId}/edit`);
  }, [router, orderId]);

  const handleStatusUpdate = useCallback(async () => {
    if (!newStatus) return;

    setUpdatingStatus(true);
    try {
      await apiClient.purchaseOrders.updateStatus(orderId, newStatus);
      toast.success('Purchase order status updated successfully');
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

  const handleReceive = useCallback(() => {
    router.push(`/purchase-orders/${orderId}/receive`);
  }, [router, orderId]);

  const handleExport = useCallback(() => {
    window.open(`/api/purchase-orders/${orderId}/export`, '_blank');
  }, [orderId]);

  const handleGoBack = useCallback(() => {
    router.push('/purchase-orders');
  }, [router]);

  // Loading state
  if (isLoading) {
    return (
      <DashboardLayout title="Purchase Order Details">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  // Error state
  if (error || !order) {
    return (
      <DashboardLayout title="Purchase Order Details">
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">Failed to load purchase order details</p>
          <Button onClick={handleGoBack} variant="outline">
            Back to Purchase Orders
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const orderData = order?.data || order;
  const statusConfig = STATUS_CONFIG[orderData.status];
  const StatusIcon = statusConfig.icon;

  return (
    <DashboardLayout title={`PO ${orderData.po_number}`}>
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
              Back to Purchase Orders
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Package className="h-6 w-6" />
                Purchase Order {orderData.po_number}
              </h1>
              <p className="text-gray-600">
                View and manage purchase order details
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
                  <DialogTitle>Update Purchase Order Status</DialogTitle>
                  <DialogDescription>
                    Change the status of this purchase order.
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
            {orderData.status === 'approved' && (
              <Button onClick={handleReceive} className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Receive Items
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
                <Package className="h-5 w-5" />
                Order Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">PO Number</label>
                <p className="text-lg font-semibold">{orderData.po_number}</p>
              </div>
              
              <Separator />
              
              <div>
                <label className="text-sm font-medium text-gray-500">Supplier</label>
                <p className="text-lg">{orderData.supplier_name || 'N/A'}</p>
              </div>
              
              <Separator />
              
              <div>
                <label className="text-sm font-medium text-gray-500">Total Amount</label>
                <p className="text-lg font-semibold flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  {(orderData.total_amount / 100).toFixed(2)}
                </p>
              </div>

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
                  <TableHead className="text-right">Ordered</TableHead>
                  <TableHead className="text-right">Received</TableHead>
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
                    <TableCell className="text-right">
                      {item.quantity_ordered}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.quantity_received || 0}
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
                onClick={() => router.push(`/inventory?po_id=${orderId}`)}
              >
                View Inventory Changes
              </Button>
              <Button 
                variant="outline" 
                onClick={() => router.push(`/suppliers/${orderData.supplier_id}`)}
              >
                View Supplier Details
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}