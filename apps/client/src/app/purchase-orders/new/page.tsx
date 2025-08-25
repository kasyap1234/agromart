"use client";

import { useState, useEffect, useCallback } from 'react';
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
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Loader2, ArrowLeft, Save, X, Plus, Trash2, Package, ShoppingCart } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Validation schemas following Zod best practices
const purchaseOrderItemSchema = z.object({
  product_id: z.string().min(1, 'Product is required'),
  quantity_ordered: z.number().min(1, 'Quantity must be at least 1'),
  unit_price: z.number().min(0, 'Unit price must be non-negative'),
  notes: z.string().optional(),
});

const purchaseOrderSchema = z.object({
  supplier_id: z.string().min(1, 'Supplier is required'),
  expected_delivery_date: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(purchaseOrderItemSchema).min(1, 'At least one item is required'),
});

type PurchaseOrderFormData = z.infer<typeof purchaseOrderSchema>;
type PurchaseOrderItemFormData = z.infer<typeof purchaseOrderItemSchema>;

// Types for API responses
interface Supplier {
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
  cost_price?: number;
}

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  // Form setup with React Hook Form
  const form = useForm<PurchaseOrderFormData>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: {
      supplier_id: '',
      expected_delivery_date: '',
      notes: '',
      items: [
        {
          product_id: '',
          quantity_ordered: 1,
          unit_price: 0,
          notes: '',
        }
      ],
    },
  });

  // Field array for dynamic items
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Data fetching with SWR
  const { data: suppliersData, isLoading: loadingSuppliers } = useSWR(
    'suppliers-list',
    () => apiClient.suppliers.list({ page: 1, limit: 1000 }),
    { revalidateOnFocus: false }
  );

  const { data: productsData, isLoading: loadingProducts } = useSWR(
    'products-list',
    () => apiClient.products.list({ page: 1, limit: 1000 }),
    { revalidateOnFocus: false }
  );

  const suppliers: Supplier[] = Array.isArray(suppliersData) 
    ? suppliersData 
    : suppliersData?.data || [];

  const products: Product[] = Array.isArray(productsData) 
    ? productsData 
    : productsData?.data || [];

  // Event handlers following React best practices
  const addItem = useCallback(() => {
    append({
      product_id: '',
      quantity_ordered: 1,
      unit_price: 0,
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

  const calculateItemTotal = useCallback((quantity: number, unitPrice: number) => {
    return quantity * unitPrice;
  }, []);

  const calculateGrandTotal = useCallback(() => {
    const items = form.watch('items');
    return items.reduce((total, item) => {
      return total + calculateItemTotal(item.quantity_ordered, item.unit_price);
    }, 0);
  }, [form, calculateItemTotal]);

  const onSubmit = useCallback(async (data: PurchaseOrderFormData) => {
    setSubmitting(true);
    try {
      // Transform data for API
      const requestData = {
        supplier_id: data.supplier_id,
        expected_delivery_date: data.expected_delivery_date || undefined,
        notes: data.notes || undefined,
        items: data.items.map(item => ({
          product_id: item.product_id,
          quantity_ordered: item.quantity_ordered,
          unit_price: Math.round(item.unit_price * 100), // Convert to cents
          notes: item.notes || undefined,
        })),
      };

      const response = await apiClient.purchaseOrders.create(requestData);
      toast.success('Purchase order created successfully');
      
      // Navigate to detail page if ID is returned
      if (response?.data?.id) {
        router.push(`/purchase-orders/${response.data.id}`);
      } else {
        router.push('/purchase-orders');
      }
    } catch (error: any) {
      console.error('Error creating purchase order:', error);
      const message = error?.response?.data?.message || error?.message || 'Failed to create purchase order';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }, [router]);

  const handleCancel = useCallback(() => {
    router.push('/purchase-orders');
  }, [router]);

  const generatePONumber = useCallback(() => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `PO-${timestamp}-${random}`;
  }, []);

  // Auto-populate unit price when product is selected
  const handleProductChange = useCallback((productId: string, itemIndex: number) => {
    const product = products.find(p => p.id === productId);
    if (product && product.cost_price) {
      form.setValue(`items.${itemIndex}.unit_price`, product.cost_price / 100);
    }
  }, [products, form]);

  if (loadingSuppliers || loadingProducts) {
    return (
      <DashboardLayout title="New Purchase Order">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading data...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="New Purchase Order">
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
              Back to Purchase Orders
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create Purchase Order</h1>
              <p className="text-gray-600">
                Create a new purchase order for inventory replenishment
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
                  {/* Supplier Selection */}
                  <FormField
                    control={form.control}
                    name="supplier_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supplier *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a supplier" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {suppliers.map((supplier) => (
                              <SelectItem key={supplier.id} value={supplier.id}>
                                <div>
                                  <div className="font-medium">{supplier.name}</div>
                                  {supplier.email && (
                                    <div className="text-sm text-gray-500">{supplier.email}</div>
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
                                    {products.map((product) => (
                                      <SelectItem key={product.id} value={product.id}>
                                        <div>
                                          <div className="font-medium">{product.name}</div>
                                          <div className="text-sm text-gray-500">
                                            SKU: {product.sku}
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
                            name={`items.${index}.quantity_ordered`}
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
                            form.watch(`items.${index}.quantity_ordered`),
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
                disabled={submitting || suppliers.length === 0 || products.length === 0}
                className="flex items-center gap-2"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {submitting ? 'Creating...' : 'Create Purchase Order'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}