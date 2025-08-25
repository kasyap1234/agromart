"use client";

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import useSWR from 'swr';
import { apiClient } from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ArrowLeft, Save, X, Plus, Trash2, ShoppingCart } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Validation schema following Zod best practices
const salesOrderSchema = z.object({
  customer_id: z.string().min(1, 'Customer is required'),
  location_id: z.string().optional(),
  expected_delivery_date: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      product_id: z.string().min(1, 'Product is required'),
      batch_id: z.string().optional(),
      quantity_ordered: z.number().min(1, 'Quantity must be at least 1'),
      unit_price: z.number().min(0, 'Unit price must be non-negative'),
      tax_percent: z.number().min(0).max(100).optional(),
      discount_percent: z.number().min(0).max(100).optional(),
      notes: z.string().optional(),
    })
  ).min(1, 'At least one item is required'),
});

type SalesOrderFormData = z.infer<typeof salesOrderSchema>;

// Types following TypeScript best practices
interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  selling_price: number;
}

interface Batch {
  id: string;
  batch_number: string;
  expiry_date: string;
}

interface Location {
  id: string;
  name: string;
  location_type: string;
}

export default function NewSalesOrderPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [batches, setBatches] = useState<Record<string, Batch[]>>({});

  // Form setup with React Hook Form following React 19 patterns
  const form = useForm<SalesOrderFormData>({
    resolver: zodResolver(salesOrderSchema),
    defaultValues: {
      customer_id: '',
      location_id: '',
      expected_delivery_date: '',
      notes: '',
      items: [
        {
          product_id: '',
          batch_id: '',
          quantity_ordered: 1,
          unit_price: 0,
          tax_percent: 0,
          discount_percent: 0,
          notes: '',
        },
      ],
    },
  });

  // Field array for dynamic items
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Data fetching with SWR
  const { data: customers, isLoading: loadingCustomers } = useSWR<Customer[]>(
    'customers',
    () => apiClient.customers.list({ active: true }).then(res => res?.data || [])
  );

  const { data: products, isLoading: loadingProducts } = useSWR<Product[]>(
    'products',
    () => apiClient.products.list({ limit: 1000 }).then(res => res?.data || [])
  );

  const { data: locations, isLoading: loadingLocations } = useSWR<Location[]>(
    'locations',
    () => apiClient.locations.list({ limit: 1000 }).then(res => res?.data || [])
  );

  // Event handlers and calculations
  const fetchBatches = useCallback(async (productId: string) => {
    if (!productId || batches[productId]) return;
    try {
      const response = await apiClient.batches.list({ product_id: productId });
      const batchList = response?.data || [];
      setBatches(prev => ({ ...prev, [productId]: batchList }));
    } catch (error) {
      console.error('Error fetching batches:', error);
    }
  }, [batches]);

  const calculateItemTotal = useCallback((item: any) => {
    const baseTotal = item.quantity_ordered * item.unit_price;
    const taxAmount = baseTotal * (item.tax_percent || 0) / 100;
    const discountAmount = baseTotal * (item.discount_percent || 0) / 100;
    return baseTotal + taxAmount - discountAmount;
  }, []);

  const calculateGrandTotal = useCallback(() => {
    const items = form.watch('items');
    return items.reduce((total, item) => total + calculateItemTotal(item), 0);
  }, [form, calculateItemTotal]);

  const handleAddItem = useCallback(() => {
    append({
      product_id: '',
      batch_id: '',
      quantity_ordered: 1,
      unit_price: 0,
      tax_percent: 0,
      discount_percent: 0,
      notes: '',
    });
  }, [append]);

  const handleRemoveItem = useCallback((index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  }, [remove, fields.length]);

  const handleProductChange = useCallback((productId: string, index: number) => {
    const product = products?.find(p => p.id === productId);
    if (product) {
      form.setValue(`items.${index}.unit_price`, product.selling_price);
      fetchBatches(productId);
    }
  }, [products, form, fetchBatches]);

  const onSubmit = async (data: SalesOrderFormData) => {
    setSubmitting(true);
    try {
      const orderData = {
        customer_id: data.customer_id,
        location_id: data.location_id || null,
        expected_delivery_date: data.expected_delivery_date || null,
        notes: data.notes || null,
        items: data.items.map(item => ({
          product_id: item.product_id,
          batch_id: item.batch_id || null,
          quantity_ordered: item.quantity_ordered,
          unit_price: Math.round(item.unit_price * 100),
          tax_percent: item.tax_percent || 0,
          discount_percent: item.discount_percent || 0,
          notes: item.notes || null,
        })),
        total_amount: Math.round(calculateGrandTotal() * 100),
        status: 'draft',
      };

      const response = await apiClient.sales.orders.create(orderData);
      toast.success('Sales order created successfully');
      
      if (response?.data?.id) {
        router.push(`/sales-orders/${response.data.id}`);
      } else {
        router.push('/sales-orders');
      }
    } catch (error: any) {
      console.error('Error creating sales order:', error);
      const message = error?.response?.data?.message || error?.message || 'Failed to create sales order';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingCustomers || loadingProducts || loadingLocations) {
    return (
      <DashboardLayout title="Create Sales Order">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Create Sales Order">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push('/sales-orders')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Sales Orders
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create New Sales Order</h1>
              <p className="text-gray-600">Add a new customer order with multiple items</p>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Order Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Order Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="customer_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a customer" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {customers?.map((customer) => (
                              <SelectItem key={customer.id} value={customer.id}>
                                {customer.name} {customer.email && `(${customer.email})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="location_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a location (optional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {locations?.map((location) => (
                              <SelectItem key={location.id} value={location.id}>
                                {location.name} ({location.location_type})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="expected_delivery_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expected Delivery Date</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            min={new Date().toISOString().split('T')[0]}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Additional notes (optional)" 
                            {...field} 
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

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
                      <TableHead>Batch</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Tax %</TableHead>
                      <TableHead>Discount %</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => {
                      const productId = form.watch(`items.${index}.product_id`);
                      const productBatches = batches[productId] || [];
                      const itemTotal = calculateItemTotal(form.watch(`items.${index}`));
                      
                      return (
                        <TableRow key={field.id}>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.product_id`}
                              render={({ field: productField }) => (
                                <Select 
                                  onValueChange={(value) => {
                                    productField.onChange(value);
                                    handleProductChange(value, index);
                                  }} 
                                  value={productField.value}
                                >
                                  <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Select product" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {products?.map((product) => (
                                      <SelectItem key={product.id} value={product.id}>
                                        {product.name} ({product.sku})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.batch_id`}
                              render={({ field: batchField }) => (
                                <Select onValueChange={batchField.onChange} value={batchField.value}>
                                  <SelectTrigger className="w-[150px]">
                                    <SelectValue placeholder="Select batch" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {productBatches.map((batch) => (
                                      <SelectItem key={batch.id} value={batch.id}>
                                        {batch.batch_number}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.quantity_ordered`}
                              render={({ field: quantityField }) => (
                                <Input
                                  type="number"
                                  min="1"
                                  className="w-[100px]"
                                  {...quantityField}
                                  onChange={(e) => quantityField.onChange(parseInt(e.target.value) || 1)}
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.unit_price`}
                              render={({ field: priceField }) => (
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  className="w-[120px]"
                                  {...priceField}
                                  onChange={(e) => priceField.onChange(parseFloat(e.target.value) || 0)}
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.tax_percent`}
                              render={({ field: taxField }) => (
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="100"
                                  className="w-[80px]"
                                  {...taxField}
                                  onChange={(e) => taxField.onChange(parseFloat(e.target.value) || 0)}
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`items.${index}.discount_percent`}
                              render={({ field: discountField }) => (
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="100"
                                  className="w-[80px]"
                                  {...discountField}
                                  onChange={(e) => discountField.onChange(parseFloat(e.target.value) || 0)}
                                />
                              )}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            ${itemTotal.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(index)}
                              disabled={fields.length === 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                <div className="mt-4 flex items-center justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddItem}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Item
                  </Button>
                  <div className="text-lg font-semibold">
                    Total: ${calculateGrandTotal().toFixed(2)}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => router.push('/sales-orders')}
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
                {submitting ? 'Creating...' : 'Create Sales Order'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}
