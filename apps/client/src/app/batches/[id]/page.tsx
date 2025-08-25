"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { apiClient } from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, ArrowLeft, Edit, Package, Calendar, DollarSign, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format, parseISO, isBefore, addDays } from 'date-fns';

interface Batch {
  id: string;
  tenant_id: string;
  product_id: string;
  batch_number: string;
  expiry_date: string;
  cost: number;
  created_at: string;
  updated_at: string;
  product_name?: string;
  product_sku?: string;
}

export default function BatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const batchId = params.id as string;

  const { data: batch, isLoading, error, mutate } = useSWR(
    batchId ? `batch:${batchId}` : null,
    () => apiClient.batches.get(batchId)
  );

  const getExpiryStatus = (expiryDate: string) => {
    const expiry = parseISO(expiryDate);
    const now = new Date();
    const warning = addDays(now, 30); // 30 days warning

    if (isBefore(expiry, now)) {
      return { 
        status: 'Expired', 
        color: 'destructive' as const,
        icon: <AlertTriangle className="h-4 w-4" />
      };
    } else if (isBefore(expiry, warning)) {
      return { 
        status: 'Expiring Soon', 
        color: 'secondary' as const,
        icon: <AlertTriangle className="h-4 w-4" />
      };
    } else {
      return { 
        status: 'Good', 
        color: 'default' as const,
        icon: <Calendar className="h-4 w-4" />
      };
    }
  };

  const handleEdit = () => {
    router.push(`/batches/${batchId}/edit`);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this batch? This action cannot be undone.')) {
      return;
    }

    try {
      await apiClient.batches.delete(batchId);
      toast.success('Batch deleted successfully');
      router.push('/batches');
    } catch (error: any) {
      console.error('Error deleting batch:', error);
      const message = error?.response?.data?.message || error?.message || 'Failed to delete batch';
      toast.error(message);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Batch Details">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !batch) {
    return (
      <DashboardLayout title="Batch Details">
        <div className="text-center py-8">
          <p className="text-red-600">Failed to load batch details</p>
          <Button 
            onClick={() => router.push('/batches')} 
            variant="outline" 
            className="mt-4"
          >
            Back to Batches
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const batchData = batch?.data || batch;
  const expiryStatus = getExpiryStatus(batchData.expiry_date);

  return (
    <DashboardLayout title={`Batch ${batchData.batch_number}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push('/batches')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Batches
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Batch {batchData.batch_number}
              </h1>
              <p className="text-gray-600">
                Batch details and information
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleEdit} className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Edit Batch
            </Button>
            <Button 
              onClick={handleDelete} 
              variant="destructive" 
              className="flex items-center gap-2"
            >
              Delete
            </Button>
          </div>
        </div>

        {/* Batch Information */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Batch Number</label>
                <p className="text-lg font-semibold">{batchData.batch_number}</p>
              </div>
              
              <Separator />
              
              <div>
                <label className="text-sm font-medium text-gray-500">Product</label>
                <p className="text-lg">{batchData.product_name || 'N/A'}</p>
                {batchData.product_sku && (
                  <p className="text-sm text-gray-500">SKU: {batchData.product_sku}</p>
                )}
              </div>
              
              <Separator />
              
              <div>
                <label className="text-sm font-medium text-gray-500">Cost per Unit</label>
                <p className="text-lg font-semibold flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  {(batchData.cost / 100).toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Expiry Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Expiry Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Expiry Date</label>
                <p className="text-lg font-semibold">
                  {format(parseISO(batchData.expiry_date), 'PPP')}
                </p>
              </div>
              
              <Separator />
              
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <div className="flex items-center gap-2">
                  <Badge variant={expiryStatus.color} className="flex items-center gap-1">
                    {expiryStatus.icon}
                    {expiryStatus.status}
                  </Badge>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <label className="text-sm font-medium text-gray-500">Days Until Expiry</label>
                <p className="text-lg">
                  {Math.ceil((parseISO(batchData.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Audit Information */}
        <Card>
          <CardHeader>
            <CardTitle>Audit Trail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Created At</label>
                <p className="text-sm">
                  {format(parseISO(batchData.created_at), 'PPp')}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Last Updated</label>
                <p className="text-sm">
                  {batchData.updated_at ? format(parseISO(batchData.updated_at), 'PPp') : 'Never'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Related Inventory (if available) */}
        <Card>
          <CardHeader>
            <CardTitle>Related Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Inventory movements and stock levels for this batch will be displayed here.
            </p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => router.push(`/inventory?batch_id=${batchId}`)}
            >
              View Inventory for this Batch
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}