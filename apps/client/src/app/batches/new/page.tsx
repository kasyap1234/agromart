"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { Loader2, ArrowLeft, Save, X, Package } from 'lucide-react';
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

export default function NewBatchPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const form = useForm<BatchFormData>({
    resolver: zodResolver(batchSchema),
    defaultValues: {
      product_id: '',
      batch_number: '',
      expiry_date: '',
      cost: 0,
    },
  });

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
    } finally {
      setLoadingProducts(false);
    }
  };

  const generateBatchNumber = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `BATCH-${timestamp}-${random}`;
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

      const response = await apiClient.batches.create(requestData);
      toast.success('Batch created successfully');
      
      // Redirect to the created batch detail page
      if (response?.data?.id) {
        router.push(`/batches/${response.data.id}`);
      } else {
        router.push('/batches');
      }
    } catch (error: any) {
      console.error('Error creating batch:', error);
      const message = error?.response?.data?.message || error?.message || 'Failed to create batch';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/batches');
  };

  const handleGenerateBatchNumber = () => {
    const batchNumber = generateBatchNumber();
    form.setValue('batch_number', batchNumber);
  };

  return (
    <DashboardLayout title="New Batch">
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
              <h1 className="text-2xl font-bold text-gray-900">Create New Batch</h1>
              <p className="text-gray-600">
                Add a new product batch with expiry tracking
              </p>
            </div>
          </div>
        </div>

        {/* Create Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Batch Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingProducts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading products...</span>
              </div>
            ) : (
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
                          <div className="flex gap-2">
                            <FormControl>
                              <Input 
                                placeholder="Enter batch number" 
                                {...field} 
                              />
                            </FormControl>
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={handleGenerateBatchNumber}
                              className="shrink-0"
                            >
                              Generate
                            </Button>
                          </div>
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
                              min={new Date().toISOString().split('T')[0]} // Minimum today
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

                  {/* Additional Information */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-blue-900 mb-2">Batch Guidelines</h3>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Batch numbers should be unique for each product</li>
                      <li>• Expiry date is used for inventory rotation and alerts</li>
                      <li>• Cost per unit will be used for inventory valuation</li>
                      <li>• Use the "Generate" button to create a unique batch number</li>
                    </ul>
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
                      disabled={submitting || products.length === 0}
                      className="flex items-center gap-2"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {submitting ? 'Creating...' : 'Create Batch'}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}