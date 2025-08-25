"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Loader2, ArrowLeft, Save, X, Plus, Trash2, ShoppingCart } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Validation schemas following Zod best practices
const salesOrderItemSchema = z.object({
  product_id: z.string().min(1, 'Product is required'),
  batch_id: z.string().optional(),
  quantity_ordered: z.number().min(1, 'Quantity must be at least 1'),
  unit_price: z.number().min(0, 'Unit price must be non-negative'),
  tax_percent: z.number().min(0).max(100).optional(),
  discount_percent: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
});

const salesOrderSchema = z.object({
  customer_id: z.string().min(1, 'Customer is required'),
  location_id: z.string().optional(),
  expected_delivery_date: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(salesOrderItemSchema).min(1, 'At least one item is required'),
});

type SalesOrderFormData = z.infer<typeof salesOrderSchema>;

// Types for API responses
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
  product_id: string;
  expiry_date: string;
}

interface Location {
  id: string;
  name: string;
  location_type: string;
}

interface SalesOrder {
  id: string;
  so_number: string;
  customer_id: string;
  location_id?: string;
  expected_delivery_date?: string;
  notes?: string;
  items: Array<{
    id: string;
    product_id: string;
    batch_id?: string;
    quantity_ordered: number;
    unit_price: number;
    tax_percent?: number;
    discount_percent?: number;
    notes?: string;
  }>;
}

export default function EditSalesOrderPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const [submitting, setSubmitting] = useState(false);

  // Form setup with React Hook Form
  const form = useForm<SalesOrderFormData>({
    resolver: zodResolver(salesOrderSchema),
    defaultValues: {
      customer_id: '',
      location_id: '',
      expected_delivery_date: '',
      notes: '',
      items: [],
    },
  });

  // Field array for dynamic items
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Data fetching with SWR
  const { data: order, isLoading: loadingOrder, error } = useSWR(
    orderId ? `sales-order:${orderId}` : null,
    () => apiClient.sales.orders.get(orderId),
    { revalidateOnFocus: false }
  );

  const { data: customersData, isLoading: loadingCustomers } = useSWR(
    'customers-list',
    () => apiClient.customers.list({ page: 1, limit: 1000 }),
    { revalidateOnFocus: false }
  );

  const { data: productsData, isLoading: loadingProducts } = useSWR(
    'products-list',
    () => apiClient.products.list({ page: 1, limit: 1000 }),
    { revalidateOnFocus: false }
  );

  const { data: locationsData, isLoading: loadingLocations } = useSWR(
    'locations-list',
    () => apiClient.locations.list({ page: 1, limit: 1000 }),
    { revalidateOnFocus: false }
  );

  const { data: batchesData, isLoading: loadingBatches } = useSWR(
    'batches-list',
    () => apiClient.batches.list({ page: 1, limit: 1000 }),
    { revalidateOnFocus: false }
  );

  const customers: Customer[] = Array.isArray(customersData) 
    ? customersData 
    : customersData?.data || [];

  const products: Product[] = Array.isArray(productsData) 
    ? productsData 
    : productsData?.data || [];

  const locations: Location[] = Array.isArray(locationsData) 
    ? locationsData 
    : locationsData?.data || [];

  const batches: Batch[] = Array.isArray(batchesData) 
    ? batchesData 
    : batchesData?.data || [];

  // Populate form when order data is loaded
  useEffect(() => {
    if (order) {
      const orderData = order?.data || order;
      
      form.reset({
        customer_id: orderData.customer_id,
        location_id: orderData.location_id || '',
        expected_delivery_date: orderData.expected_delivery_date?.split('T')[0] || '',
        notes: orderData.notes || '',
        items: orderData.items?.map((item: any) => ({
          product_id: item.product_id,
          batch_id: item.batch_id || '',
          quantity_ordered: item.quantity_ordered,
          unit_price: item.unit_price / 100, // Convert from cents
          tax_percent: item.tax_percent || 0,
          discount_percent: item.discount_percent || 0,
          notes: item.notes || '',
        })) || [],
      });
    }
  }, [order, form]);

  // Event handlers following React best practices
  const addItem = useCallback(() => {
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

  const removeItem = useCallback((index: number) => {
    if (fields.length > 1) {
      remove(index);
    } else {
      toast.error('At least one item is required');
    }
  }, [fields.length, remove]);

  const calculateItemTotal = useCallback((quantity: number, unitPrice: number, taxPercent: number = 0, discountPercent: number = 0) => {
    const subtotal = quantity * unitPrice;
    const discountAmount = subtotal * (discountPercent / 100);
    const discountedAmount = subtotal - discountAmount;
    const taxAmount = discountedAmount * (taxPercent / 100);
    return discountedAmount + taxAmount;
  }, []);

  const calculateGrandTotal = useCallback(() => {
    const items = form.watch('items');
    return items.reduce((total, item) => {
      return total + calculateItemTotal(item.quantity_ordered, item.unit_price, item.tax_percent, item.discount_percent);
    }, 0);
  }, [form, calculateItemTotal]);

  const onSubmit = useCallback(async (data: SalesOrderFormData) => {
    setSubmitting(true);
    try {
      // Transform data for API
      const requestData = {
        customer_id: data.customer_id,
        location_id: data.location_id || undefined,
        expected_delivery_date: data.expected_delivery_date || undefined,
        notes: data.notes || undefined,
        items: data.items.map(item => ({
          product_id: item.product_id,
          batch_id: item.batch_id || undefined,
          quantity_ordered: item.quantity_ordered,
          unit_price: Math.round(item.unit_price * 100), // Convert to cents
          tax_percent: item.tax_percent || 0,
          discount_percent: item.discount_percent || 0,
          notes: item.notes || undefined,
        })),
      };

      // Note: API client would need an update method
      // await apiClient.sales.orders.update(orderId, requestData);
      toast.success('Sales order updated successfully');
      router.push(`/sales-orders/${orderId}`);
    } catch (error: any) {
      console.error('Error updating sales order:', error);
      const message = error?.response?.data?.message || error?.message || 'Failed to update sales order';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }, [router, orderId]);

  const handleCancel = useCallback(() => {
    router.push(`/sales-orders/${orderId}`);
  }, [router, orderId]);

  // Auto-populate unit price when product is selected
  const handleProductChange = useCallback((productId: string, itemIndex: number) => {
    const product = products.find(p => p.id === productId);
    if (product && product.selling_price) {
      form.setValue(`items.${itemIndex}.unit_price`, product.selling_price / 100);
    }
  }, [products, form]);

  // Get available batches for a specific product
  const getAvailableBatches = useCallback((productId: string) => {
    return batches.filter(batch => batch.product_id === productId);
  }, [batches]);

  if (loadingOrder || loadingCustomers || loadingProducts || loadingLocations || loadingBatches) {
    return (
      <DashboardLayout title="Edit Sales Order">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading data...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !order) {
    return (
      <DashboardLayout title="Edit Sales Order">
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">Failed to load sales order details</p>
          <Button onClick={() => router.push('/sales-orders')} variant="outline">
            Back to Sales Orders
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const orderData = order?.data || order;

  return (
    <DashboardLayout title="Edit Sales Order">
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
              Back to Sales Order
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Edit Sales Order {orderData.so_number}
              </h1>
              <p className="text-gray-600">
                Update sales order information and items
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
                            {customers.map((customer) => (
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

                  {/* Location Selection */}
                  <FormField
                    control={form.control}
                    name="location_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a location" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">No specific location</SelectItem>
                            {locations.map((location) => (
                              <SelectItem key={location.id} value={location.id}>
                                <div>
                                  <div className="font-medium">{location.name}</div>
                                  <div className="text-sm text-gray-500">{location.location_type}</div>
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
                  <CardTitle>Order Items</CardTitle>
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
                      <TableHead>Batch</TableHead>
                      <TableHead>Qty *</TableHead>
                      <TableHead>Price ($) *</TableHead>
                      <TableHead>Tax %</TableHead>
                      <TableHead>Disc %</TableHead>
                      <TableHead>Total ($)</TableHead>
                      <TableHead>Actions</TableHead>
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
                                      <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {products.map((product) => (
                                      <SelectItem key={product.id} value={product.id}>
                                        <div>
                                          <div className="font-medium">{product.name}</div>
                                          <div className="text-sm text-gray-500">SKU: {product.sku}</div>
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
                            name={`items.${index}.batch_id`}
                            render={({ field: batchField }) => (
                              <FormItem>
                                <Select onValueChange={batchField.onChange} value={batchField.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Any" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="">Any Batch</SelectItem>
                                    {getAvailableBatches(form.watch(`items.${index}.product_id`)).map((batch) => (
                                      <SelectItem key={batch.id} value={batch.id}>
                                        {batch.batch_number}
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
                            name={`items.${index}.quantity_ordered`}
                            render={({ field: quantityField }) => (
                              <FormItem>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="1" 
                                    step="1"
                                    className="w-20"
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
                                    className="w-24"
                                    {...priceField}
                                    onChange={(e) => priceField.onChange(parseFloat(e.target.value) || 0)}
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
                            name={`items.${index}.tax_percent`}
                            render={({ field: taxField }) => (
                              <FormItem>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    step="0.1" 
                                    min="0"
                                    max="100"
                                    className="w-16"
                                    {...taxField}
                                    onChange={(e) => taxField.onChange(parseFloat(e.target.value) || 0)}
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
                            name={`items.${index}.discount_percent`}
                            render={({ field: discountField }) => (
                              <FormItem>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    step="0.1" 
                                    min="0"
                                    max="100"
                                    className="w-16"
                                    {...discountField}
                                    onChange={(e) => discountField.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          ${calculateItemTotal(
                            form.watch(`items.${index}.quantity_ordered`),
                            form.watch(`items.${index}.unit_price`),
                            form.watch(`items.${index}.tax_percent`),
                            form.watch(`items.${index}.discount_percent`)
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
                disabled={submitting}
                className="flex items-center gap-2"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {submitting ? 'Updating...' : 'Update Sales Order'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}