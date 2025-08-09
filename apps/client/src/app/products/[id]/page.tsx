"use client";

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from 'react-hot-toast';
import { Pencil, Trash2 } from "lucide-react";
import { apiClient } from '@/lib/api';
import Link from "next/link";

export default function ProductDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params?.id) ? params?.id[0] : (params as any)?.id;
  const { data, error, isLoading, mutate } = useSWR(id ? [`/products/${id}`] : null, () => apiClient.products.get(String(id)));
  const [deleting, setDeleting] = useState(false);

  const product = (data as any)?.data || data;

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }
    
    try {
      setDeleting(true);
      await apiClient.products.delete(String(id));
      toast.success('Product deleted successfully');
      router.push('/products');
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to delete product';
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  if (!id) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8">
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-red-500 mb-4">Failed to load product.</div>
            <Button variant="outline" onClick={() => mutate()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Product Details</h1>
          <p className="text-muted-foreground">View and manage product information</p>
        </div>
        <div className="flex space-x-2">
          <Button asChild variant="outline">
            <Link href={`/products/${id}/edit`}>
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </Link>
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            <Trash2 className="w-4 h-4 mr-2" />
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>

      {product && (
        <Card>
          <CardHeader>
            <CardTitle>{product.name}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Basic Information</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">SKU</p>
                  <p className="font-medium">{product.sku}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Brand</p>
                  <p className="font-medium">{product.brand || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Price</p>
                  <p className="font-medium">₹{product.price?.toFixed(2) || "0.00"}</p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4">Pricing Details</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Price per Unit</p>
                  <p className="font-medium">₹{product.price_per_unit?.toFixed(2) || "0.00"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">GST Percentage</p>
                  <p className="font-medium">{product.gst_percent || 0}%</p>
                </div>
              </div>
            </div>
            
            <div className="md:col-span-2">
              <h3 className="text-lg font-medium mb-4">Description</h3>
              <p className="text-muted-foreground">
                {product.description || 'No description provided'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
