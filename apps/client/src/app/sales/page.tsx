"use client";

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { apiClient } from '@/lib/api';
import { useCustomers } from '@/hooks/useCustomers';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Eye, Edit, Download, ShoppingCart, User, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format, parseISO } from 'date-fns';

interface SalesOrder {
  id: string;
  tenant_id: string;
  so_number: string;
  customer_id: string;
  location_id?: string;
  order_date: string;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  total_amount: number;
  tax_amount: number;
  discount_amount: number;
  final_amount: number;
  status: 'PENDING' | 'APPROVED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  notes?: string;
  created_by: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  customer_name?: string;
}

interface SalesOrderItem {
  id: string;
  sales_order_id: string;
  product_id: string;
  batch_id?: string;
  quantity_ordered: number;
  quantity_shipped: number;
  unit_price: number;
  total_price: number;
  tax_percent: number;
  discount_percent: number;
  notes?: string;
  product_name?: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
}

interface CreateSalesOrderRequest {
  customer_id: string;
  location_id?: string;
  expected_delivery_date?: string;
  notes?: string;
  items: CreateSalesOrderItemRequest[];
}

interface CreateSalesOrderItemRequest {
  product_id: string;
  batch_id?: string;
  quantity_ordered: number;
  unit_price: number;
  tax_percent?: number;
  discount_percent?: number;
  notes?: string;
}

export default function SalesPage() {
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [orderItems, setOrderItems] = useState<SalesOrderItem[]>([]);
  
  // Form fields
  const [customerId, setCustomerId] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<CreateSalesOrderItemRequest[]>([
    { product_id: '', quantity_ordered: 1, unit_price: 0 }
  ]);

  // Pagination and filtering
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [filterCustomerId, setFilterCustomerId] = useState('');

  const { customers, isLoading: customersLoading } = useCustomers();

  const { data: salesData, isLoading: salesLoading, mutate: mutateSales } = useSWR(
    ["sales:orders", page, filterCustomerId],
    () => apiClient.sales.orders.list({ page, limit, customer_id: filterCustomerId || undefined })
  );

  useEffect(() => {
    if (salesData) {
      setSalesOrders(((salesData as any)?.data ?? salesData) as SalesOrder[]);
      setLoading(false);
    }
  }, [salesData]);

  const refreshSales = () => mutateSales();

  // customers via hook

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/products?limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setProducts(data.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchOrderDetails = async (orderId: string) => {
    try {
      const data = await apiClient.sales.orders.get(orderId);
      setOrderItems(((data as any)?.data || data)?.items || []);
    } catch (error) {
      console.error('Error fetching order details:', error);
    }
  };

  const resetForm = () => {
    setCustomerId('');
    setExpectedDeliveryDate('');
    setNotes('');
    setItems([{ product_id: '', quantity_ordered: 1, unit_price: 0 }]);
    setShowCreateForm(false);
  };

  const addItem = () => {
    setItems([...items, { product_id: '', quantity_ordered: 1, unit_price: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof CreateSalesOrderItemRequest, value: any) => {
    const updatedItems = items.map((item, i) => {
      if (i === index) {
        const updatedItem = { ...item, [field]: value };
        
        // Auto-calculate unit price when product is selected
        if (field === 'product_id') {
          const product = products.find(p => p.id === value);
          if (product) {
            updatedItem.unit_price = product.price;
          }
        }
        
        return updatedItem;
      }
      return item;
    });
    setItems(updatedItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerId || items.some(item => !item.product_id || item.quantity_ordered <= 0 || item.unit_price <= 0)) {
      toast.error('Please fill all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const requestData: CreateSalesOrderRequest = {
        customer_id: customerId,
        expected_delivery_date: expectedDeliveryDate || undefined,
        notes: notes || undefined,
        items: items.map(item => ({
          ...item,
          tax_percent: item.tax_percent || 0,
          discount_percent: item.discount_percent || 0,
        })),
      };
      const data = await apiClient.sales.orders.create(requestData);
      const ok = (data as any)?.success ?? true;
      if (ok) {
        toast.success('Sales order created successfully');
        resetForm();
        refreshSales();
      } else {
        throw new Error((data as any)?.error?.message || 'Failed to create sales order');
      }
    } catch (error: any) {
      console.error('Error creating sales order:', error);
      toast.error(error.message || 'Failed to create sales order');
    } finally {
      setSubmitting(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const data = await apiClient.sales.orders.updateStatus(orderId, status);
      const ok = (data as any)?.success ?? true;
      if (ok) {
        toast.success('Order status updated successfully');
        refreshSales();
      } else {
        throw new Error((data as any)?.error?.message || 'Failed to update status');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    }
  };

  const downloadCSV = async () => {
    try {
      // Attempt simple fetch; auth should be handled by cookies/interceptors
      const response = await fetch('/api/sales/orders.csv');
      if (!response.ok) throw new Error('Failed to download CSV');
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'sales_orders.csv';
      link.click();
      window.URL.revokeObjectURL(downloadUrl);
      toast.success('CSV downloaded successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to download CSV');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'default';
      case 'APPROVED': return 'secondary';
      case 'SHIPPED': return 'outline';
      case 'DELIVERED': return 'default';
      case 'CANCELLED': return 'destructive';
      default: return 'default';
    }
  };

  const showOrderDetailsModal = async (order: SalesOrder) => {
    setSelectedOrder(order);
    await fetchOrderDetails(order.id);
    setShowOrderDetails(true);
  };

  if (salesLoading || customersLoading || loading) {
    return (
      <DashboardLayout title="Sales Orders">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Sales Orders">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sales Orders</h1>
            <p className="text-gray-600">Manage customer orders and sales</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={downloadCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Order
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-4 items-end">
              <div className="w-full sm:w-64">
                <Label htmlFor="filterCustomer">Filter by Customer</Label>
                <Select value={filterCustomerId} onValueChange={setFilterCustomerId}>
                  <SelectTrigger id="filterCustomer" aria-label="Filter by customer">
                    <SelectValue placeholder="All customers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All customers</SelectItem>
                    {customers.map((customer: Customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={() => setFilterCustomerId('')}>
                Clear Filter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Create Order Form */}
        {showCreateForm && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Create Sales Order
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customer">Customer *</Label>
                    <select
                      id="customer"
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="">Select a customer</option>
                      {customers.map((customer: Customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name} ({customer.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <Label htmlFor="expectedDeliveryDate">Expected Delivery Date</Label>
                    <Input
                      id="expectedDeliveryDate"
                      type="date"
                      value={expectedDeliveryDate}
                      onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Order notes..."
                  />
                </div>

                {/* Order Items */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Label>Order Items *</Label>
                    <Button type="button" variant="outline" onClick={addItem}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    {items.map((item, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border rounded-lg">
                        <div>
                          <Label>Product *</Label>
                          <Select
                            value={item.product_id}
                            onValueChange={(val) => updateItem(index, 'product_id', val)}
                          >
                            <SelectTrigger aria-label="Select product">
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name} ({product.sku})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label>Quantity *</Label>
                          <Input
                            type="number"
                            value={item.quantity_ordered}
                            onChange={(e) => updateItem(index, 'quantity_ordered', parseInt(e.target.value) || 1)}
                            min="1"
                            required
                          />
                        </div>
                        
                        <div>
                          <Label>Unit Price (₹) *</Label>
                          <Input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            required
                          />
                        </div>
                        
                        <div>
                          <Label>Total</Label>
                          <div className="p-2 bg-gray-50 border rounded-md">
                            ₹{(item.quantity_ordered * item.unit_price).toFixed(2)}
                          </div>
                        </div>
                        
                        <div className="flex items-end">
                          {items.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeItem(index)}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-right">
                      <span className="text-lg font-semibold">
                        Total: ₹{items.reduce((sum, item) => sum + (item.quantity_ordered * item.unit_price), 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Sales Order
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Sales Orders List */}
        <div className="grid grid-cols-1 gap-4">
          {salesOrders.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No sales orders found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating your first sales order.
                </p>
              </CardContent>
            </Card>
          ) : (
            salesOrders.map((order) => {
              const customer = customers.find((c: Customer) => c.id === order.customer_id);
              
              return (
                <Card key={order.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold">{order.so_number}</h3>
                          <Badge variant={getStatusColor(order.status) as any}>
                            {order.status}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {customer?.name || 'Unknown Customer'}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(parseISO(order.order_date || order.created_at), 'MMM dd, yyyy')}
                          </div>
                        </div>
                        
                        <div className="text-lg font-semibold text-green-600">
                          ₹{order.final_amount}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => showOrderDetailsModal(order)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        {order.status === 'PENDING' && (
                          <Button
                            size="sm"
                            onClick={() => updateOrderStatus(order.id, 'APPROVED')}
                          >
                            Approve
                          </Button>
                        )}
                        
                        {order.status === 'APPROVED' && (
                          <Button
                            size="sm"
                            onClick={() => updateOrderStatus(order.id, 'SHIPPED')}
                          >
                            Ship
                          </Button>
                        )}
                        
                        {order.status === 'SHIPPED' && (
                          <Button
                            size="sm"
                            onClick={() => updateOrderStatus(order.id, 'DELIVERED')}
                          >
                            Deliver
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {salesOrders.length >= limit && (
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="flex items-center px-4 py-2">
              Page {page}
            </span>
            <Button
              variant="outline"
              onClick={() => setPage(prev => prev + 1)}
              disabled={salesOrders.length < limit}
            >
              Next
            </Button>
          </div>
        )}

        {/* Order Details Modal */}
        {showOrderDetails && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-4xl max-h-[80vh] overflow-auto">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Order Details - {selectedOrder.so_number}</span>
                  <Button variant="ghost" onClick={() => setShowOrderDetails(false)}>
                    ×
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Customer</Label>
                    <p>{customers.find((c: Customer) => c.id === selectedOrder.customer_id)?.name || 'Unknown'}</p>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Badge variant={getStatusColor(selectedOrder.status) as any}>
                      {selectedOrder.status}
                    </Badge>
                  </div>
                  <div>
                    <Label>Order Date</Label>
                    <p>{format(parseISO(selectedOrder.order_date || selectedOrder.created_at), 'MMM dd, yyyy')}</p>
                  </div>
                  <div>
                    <Label>Total Amount</Label>
                    <p className="font-semibold">₹{selectedOrder.final_amount}</p>
                  </div>
                </div>
                
                <div>
                  <Label>Order Items</Label>
                  <div className="mt-2 space-y-2">
                    {orderItems.map((item) => {
                      const product = products.find(p => p.id === item.product_id);
                      return (
                        <div key={item.id} className="flex justify-between items-center p-3 border rounded">
                          <div>
                            <p className="font-medium">{product?.name || 'Unknown Product'}</p>
                            <p className="text-sm text-gray-600">
                              Qty: {item.quantity_ordered} × ₹{item.unit_price} = ₹{item.total_price}
                            </p>
                          </div>
                          <div className="text-sm">
                            {item.quantity_shipped > 0 && (
                              <Badge variant="outline">
                                Shipped: {item.quantity_shipped}
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
