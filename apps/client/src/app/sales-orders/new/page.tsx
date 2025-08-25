"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { 
  ArrowLeft, 
  ShoppingCart, 
  Plus, 
  Trash2, 
  Save, 
  X, 
  Loader2,
  Package,
  User
} from 'lucide-react';

const salesOrderSchema = z.object({
  customer_id: z.string().min(1, 'Customer is required'),
  expected_delivery_date: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      product_id: z.string().min(1, 'Product is required'),
      quantity: z.number().min(1, 'Quantity must be at least 1'),
      unit_price: z.number().min(0, 'Unit price must be positive'),
    })
  ).min(1, 'At least one item is required'),
});

type SalesOrderFormData = z.infer<typeof salesOrderSchema>;

interface Product {
  id: string;
  name: string;
  sku: string;
  selling_price: number;
  current_stock: number;
}

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

export default function NewSalesOrderPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  // Fetch required data
  const { data: productsData, error: productsError } = useSWR(
    'products:list:all',
    () => apiClient.products.list({ limit: 1000 })
  );

  const { data: customersData, error: customersError } = useSWR(
    'customers:list:all',
    () => apiClient.customers.list({ limit: 1000 })
  );

  const products = (productsData as any)?.products || [];
  const customers = (customersData as any)?.customers || [];

  const form = useForm<SalesOrderFormData>({
    resolver: zodResolver(salesOrderSchema),
    defaultValues: {
      customer_id: '',
      expected_delivery_date: '',
      notes: '',
      items: [
        {
          product_id: '',
          quantity: 1,
          unit_price: 0,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const addItem = () => {
    append({
      product_id: '',
      quantity: 1,
      unit_price: 0,
    });
  };

  const removeItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const handleProductChange = (productId: string, index: number) => {
    const product = products.find((p: Product) => p.id === productId);
    if (product) {
      form.setValue(`items.${index}.unit_price`, product.selling_price);
    }
  };

  const calculateItemTotal = (quantity: number, unitPrice: number) => {
    return (quantity || 0) * (unitPrice || 0);
  };

  const calculateGrandTotal = () => {
    const items = form.watch('items');
    return items.reduce((total, item) => {
      return total + calculateItemTotal(item.quantity, item.unit_price);
    }, 0);
  };

  const onSubmit = async (data: SalesOrderFormData) => {
    setSubmitting(true);
    try {
      await apiClient.salesOrders.create({
        customer_id: data.customer_id,
        expected_delivery_date: data.expected_delivery_date || undefined,
        notes: data.notes || undefined,
        items: data.items,
      });

      toast.success('Sales order created successfully');
      router.push('/sales-orders');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create sales order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/sales-orders');
  };

  // Loading state
  if (!productsData || !customersData) {
    return (
      <DashboardLayout title="New Sales Order">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  // Error state
  if (productsError || customersError) {
    return (
      <DashboardLayout title="New Sales Order">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <X className="mx-auto h-8 w-8 text-destructive" />
              <h3 className="mt-2 text-lg font-semibold">Error Loading Data</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {productsError?.message || customersError?.message || 'Failed to load required data'}
              </p>
              <Button onClick={() => window.location.reload()} className="mt-4">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="New Sales Order">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleCancel}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Sales Orders
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create Sales Order</h1>
              <p className="text-gray-600">
                Create a new sales order for your customers
              </p>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Order Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Customer Selection */}
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
                            {customers.map((customer: Customer) => (
                              <SelectItem key={customer.id} value={customer.id}>
                                <div>
                                  <div className="font-medium">{customer.name}</div>
                                  {customer.email && (
                                    <div className="text-sm text-gray-500">{customer.email}</div>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Expected Delivery Date */}
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
                </div>

                {/* Notes */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Order Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Add any special instructions or notes..." 
                          className="min-h-[80px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Order Items
                  </CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addItem}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product *</TableHead>
                      <TableHead className="w-24">Quantity *</TableHead>
                      <TableHead className="w-32">Unit Price ($) *</TableHead>
                      <TableHead className="w-32">Total ($)</TableHead>
                      <TableHead className="w-16">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => (
                      <TableRow key={field.id}>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`items.${index}.product_id`}
                            render={({ field: productField }) => (
                              <FormItem>
                                <Select 
                                  onValueChange={(value) => {
                                    productField.onChange(value);
                                    handleProductChange(value, index);
                                  }} 
                                  value={productField.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select product" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {products.map((product: Product) => (
                                      <SelectItem key={product.id} value={product.id}>
                                        <div>
                                          <div className="font-medium">{product.name}</div>
                                          <div className="text-sm text-gray-500">
                                            SKU: {product.sku} • Stock: {product.current_stock}
                                          </div>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`items.${index}.quantity`}
                            render={({ field: quantityField }) => (
                              <FormItem>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="1" 
                                    step="1"
                                    {...quantityField}
                                    onChange={(e) => quantityField.onChange(parseInt(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`items.${index}.unit_price`}
                            render={({ field: priceField }) => (
                              <FormItem>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    step="0.01" 
                                    min="0"
                                    {...priceField}
                                    onChange={(e) => priceField.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          ${calculateItemTotal(
                            form.watch(`items.${index}.quantity`),
                            form.watch(`items.${index}.unit_price`)
                          ).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                            disabled={fields.length === 1}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Order Total */}
                <div className="mt-4 text-right">
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
                onClick={handleCancel}
                disabled={submitting}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={submitting || customers.length === 0 || products.length === 0}
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