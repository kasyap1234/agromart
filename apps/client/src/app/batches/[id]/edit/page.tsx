"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft, Save, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Validation schema
const batchSchema = z.object({
  product_id: z.string().min(1, 'Product is required'),
  batch_number: z.string().min(1, 'Batch number is required'),
  expiry_date: z.string().min(1, 'Expiry date is required'),
  cost: z.number().min(0, 'Cost must be non-negative'),
});

type BatchFormData = z.infer<typeof batchSchema>;

interface Product {
  id: string;
  name: string;
  sku: string;
}

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
}

export default function EditBatchPage() {
  const params = useParams();
  const router = useRouter();
  const batchId = params.id as string;
  const [products, setProducts] = useState<Product[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<BatchFormData>({
    resolver: zodResolver(batchSchema),
    defaultValues: {
      product_id: '',
      batch_number: '',
      expiry_date: '',
      cost: 0,
    },
  });

  const { data: batch, isLoading, error } = useSWR(
    batchId ? `batch:${batchId}` : null,
    () => apiClient.batches.get(batchId)
  );

  useEffect(() => {
    if (batch) {
      const batchData = batch?.data || batch;
      // Convert expiry date to YYYY-MM-DD format for input
      const expiryDate = batchData.expiry_date.split('T')[0] || '';
      
      form.reset({
        product_id: batchData.product_id,
        batch_number: batchData.batch_number,
        expiry_date: expiryDate,
        cost: batchData.cost / 100, // Convert from cents to dollars
      });
    }
  }, [batch, form]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const resp = await apiClient.products.list({ page: 1, limit: 1000 });
      const list = Array.isArray(resp) ? resp : (resp as any)?.data || [];
      setProducts(list);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    }
  };

  const onSubmit = async (data: BatchFormData) => {
    setSubmitting(true);
    try {
      const requestData = {
        product_id: data.product_id,
        batch_number: data.batch_number,
        expiry_date: data.expiry_date,
        cost: Math.round(data.cost * 100), // Convert to cents
      };

      await apiClient.batches.update(batchId, requestData);
      toast.success('Batch updated successfully');
      router.push(`/batches/${batchId}`);
    } catch (error: any) {
      console.error('Error updating batch:', error);
      const message = error?.response?.data?.message || error?.message || 'Failed to update batch';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push(`/batches/${batchId}`);
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Edit Batch">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !batch) {
    return (
      <DashboardLayout title="Edit Batch">
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

  return (
    <DashboardLayout title="Edit Batch">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push(`/batches/${batchId}`)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Batch Details
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Edit Batch {batchData.batch_number}
              </h1>
              <p className="text-gray-600">
                Update batch information and details
              </p>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <Card>
          <CardHeader>
            <CardTitle>Batch Information</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Product Selection */}
                  <FormField
                    control={form.control}
                    name="product_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a product" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name} ({product.sku})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Batch Number */}
                  <FormField
                    control={form.control}
                    name="batch_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Batch Number *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter batch number" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Expiry Date */}
                  <FormField
                    control={form.control}
                    name="expiry_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expiry Date *</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Cost */}
                  <FormField
                    control={form.control}
                    name="cost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cost per Unit ($) *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            min="0" 
                            placeholder="0.00" 
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-4 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleCancel}
                    disabled={submitting}
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={submitting}
                    className="flex items-center gap-2"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {submitting ? 'Updating...' : 'Update Batch'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}