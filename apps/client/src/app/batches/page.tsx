"use client";

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { apiClient } from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Edit, Calendar, Package, Eye } from 'lucide-react';
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
  product_name?: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
}

interface CreateBatchRequest {
  product_id: string;
  batch_number: string;
  expiry_date: string;
  cost: number;
}

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  
  // Form fields
  const [productId, setProductId] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cost, setCost] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const { data: batchData, isLoading: batchesLoading, mutate: mutateBatches } = useSWR(
    ["batches:list", page, limit],
    () => apiClient.batches.list({ page, limit })
  );

  useEffect(() => {
    if (batchData) {
      const batchesList = Array.isArray(batchData) ? batchData : (batchData as any)?.data || [];
      setBatches(batchesList);
      setLoading(false);
    }
  }, [batchData]);

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshBatches = () => mutateBatches();

  const fetchProducts = async () => {
    try {
      const resp = await apiClient.products.list({ page: 1, limit: 1000 });
      const list = Array.isArray(resp) ? resp : (resp as any)?.data || [];
      setProducts(list);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const resetForm = () => {
    setProductId('');
    setBatchNumber('');
    setExpiryDate('');
    setCost('');
    setEditingBatch(null);
    setShowCreateForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!productId || !batchNumber || !expiryDate || !cost) {
      toast.error('All fields are required');
      return;
    }

    setSubmitting(true);
    try {
      const requestData: CreateBatchRequest = {
        product_id: productId,
        batch_number: batchNumber,
        expiry_date: expiryDate,
        cost: parseInt(cost),
      };

      const data = editingBatch 
        ? await apiClient.batches.update(editingBatch.id, requestData)
        : await apiClient.batches.create(requestData);
      
      if (data) {
        toast.success(editingBatch ? 'Batch updated successfully' : 'Batch created successfully');
        resetForm();
        refreshBatches();
      } else {
        throw new Error('Failed to save batch');
      }
    } catch (error: any) {
      console.error('Error saving batch:', error);
      const message = error?.response?.data?.message || error?.message || 'Failed to save batch';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (batch: Batch) => {
    setEditingBatch(batch);
    setProductId(batch.product_id);
    setBatchNumber(batch.batch_number);
    setExpiryDate(batch.expiry_date.split('T')[0] || ''); // Convert to YYYY-MM-DD format
    setCost(batch.cost.toString());
    setShowCreateForm(true);
  };

  const getExpiryStatus = (expiryDate: string) => {
    const expiry = parseISO(expiryDate);
    const now = new Date();
    const warning = addDays(now, 30); // 30 days warning

    if (isBefore(expiry, now)) {
      return { status: 'expired', color: 'destructive' as const };
    } else if (isBefore(expiry, warning)) {
      return { status: 'expiring', color: 'secondary' as const };
    } else {
      return { status: 'good', color: 'default' as const };
    }
  };

  if (loading || batchesLoading) {
    return (
      <DashboardLayout title="Batches">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Batches">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Batch Management</h1>
            <p className="text-gray-600">Track product batches and expiry dates</p>
          </div>
          <Button 
            onClick={() => window.location.href = '/batches/new'}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Batch
          </Button>
        </div>

        {/* Create/Edit Form */}
        {showCreateForm && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {editingBatch ? 'Edit Batch' : 'Create New Batch'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="product">Product</Label>
                    <Select value={productId} onValueChange={setProductId}>
                      <SelectTrigger id="product" aria-label="Select product">
                        <SelectValue placeholder="Select a product" />
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
                    <Label htmlFor="batchNumber">Batch Number</Label>
                    <Input
                      id="batchNumber"
                      type="text"
                      value={batchNumber}
                      onChange={(e) => setBatchNumber(e.target.value)}
                      placeholder="Enter batch number"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="expiryDate">Expiry Date</Label>
                    <Input
                      id="expiryDate"
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="cost">Cost (₹)</Label>
                    <Input
                      id="cost"
                      type="number"
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      placeholder="Enter cost"
                      min="0"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingBatch ? 'Update Batch' : 'Create Batch'}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Batches Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {batches.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No batches found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first batch.
              </p>
            </div>
          ) : (
            batches.map((batch) => {
              const expiryStatus = getExpiryStatus(batch.expiry_date);
              const product = products.find(p => p.id === batch.product_id);
              
              return (
                <Card key={batch.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{batch.batch_number}</CardTitle>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.location.href = `/batches/${batch.id}`}
                          title="View batch details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.location.href = `/batches/${batch.id}/edit`}
                          title="Edit batch"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      {product?.name || 'Unknown Product'}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">
                        Expires: {format(parseISO(batch.expiry_date), 'MMM dd, yyyy')}
                      </span>
                      <Badge variant={expiryStatus.color}>
                        {expiryStatus.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Cost:</span>
                      <span className="font-medium">₹{batch.cost}</span>
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      Created: {format(parseISO(batch.created_at), 'MMM dd, yyyy')}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {batches.length >= limit && (
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
              disabled={batches.length < limit}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
