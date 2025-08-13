"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import useSWR from 'swr';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from 'react-hot-toast';
import { apiClient } from '@/lib/api';

interface Unit { 
  id: string; 
  name: string; 
  abbreviation: string 
}

interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  brand?: string;
  description?: string;
  unit_id: string;
  price_per_unit: number;
  gst_percent?: number;
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params?.id) ? params?.id[0] : (params as any)?.id;
  
  const { data: productData, error: productError, isLoading: productLoading } = useSWR(
    id ? [`/products/${id}`] : null, 
    () => apiClient.products.get(String(id))
  );
  
  const { data: unitsData, error: unitsError, isLoading: unitsLoading } = useSWR(
    ['/units'], 
    () => apiClient.units.list()
  );

  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState&lt;number | ''&gt;('');
  const [brand, setBrand] = useState('');
  const [description, setDescription] = useState('');
  const [unitId, setUnitId] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState&lt;number | ''&gt;('');
  const [gstPercent, setGstPercent] = useState&lt;number | ''&gt;('');
  const [submitting, setSubmitting] = useState(false);

  const product = productData?.data || productData;
  const units = Array.isArray(unitsData) ? unitsData : unitsData?.data || [];

  useEffect(() => {
    if (product) {
      setSku(product.sku || '');
      setName(product.name || '');
      setPrice(product.selling_price || product.price || '');
      setBrand(product.brand || '');
      setDescription(product.description || '');
      setUnitId(product.unit_id || '');
      setPricePerUnit(product.cost_price || product.price_per_unit || '');
      setGstPercent(product.tax_rate || product.gst_percent || '');
    }
  }, [product]);

  useEffect(() => {
    if (units && units.length > 0 && !unitId) {
      setUnitId(units[0].id);
    }
  }, [units, unitId]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !unitId || !pricePerUnit) {
      toast.error('Name, Price, Unit and Price per unit are required');
      return;
    }
    try {
      setSubmitting(true);
      await apiClient.products.update(String(id), {
        name,
        selling_price: Number(price),
        description: description || undefined,
        brand: brand || undefined,
        unit_id: unitId,
        cost_price: Number(pricePerUnit),
        tax_rate: gstPercent === '' ? undefined : Number(gstPercent),
      });
      toast.success('Product updated successfully');
      router.push(`/products/${id}`);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to update product';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (productLoading || unitsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (productError || unitsError) {
    return (
      <div className="py-8 text-red-600">
        Failed to load product or units data.
        <Button variant="outline" onClick={() => router.refresh()} className="ml-2">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Product</h1>
        <p className="text-muted-foreground">Update your product details</p>
      </div>
      
      <form onSubmit={onSubmit} className="max-w-2xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">SKU</label>
            <Input 
              value={sku} 
              onChange={e => setSku(e.target.value)} 
              required 
              disabled
            />
            <p className="text-xs text-muted-foreground mt-1">SKU cannot be changed after creation</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <Input 
              value={name} 
              onChange={e => setName(e.target.value)} 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Price</label>
            <Input 
              type="number" 
              value={price} 
              onChange={e => setPrice(e.target.value === '' ? '' : Number(e.target.value))} 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Brand</label>
            <Input 
              value={brand} 
              onChange={e => setBrand(e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Unit</label>
            <Select value={unitId} onValueChange={setUnitId}>
              <SelectTrigger>
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                {(units || []).map((u: Unit) => (
                  <SelectItem key={u.id} value={u.id}>{u.name} ({u.abbreviation})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Price per unit</label>
            <Input 
              type="number" 
              value={pricePerUnit} 
              onChange={e => setPricePerUnit(e.target.value === '' ? '' : Number(e.target.value))} 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">GST %</label>
            <Input 
              type="number" 
              value={gstPercent} 
              onChange={e => setGstPercent(e.target.value === '' ? '' : Number(e.target.value))} 
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Description</label>
            <Textarea 
              rows={4} 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
            />
          </div>
        </div>
        <div className="flex space-x-2 pt-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Updating...' : 'Update Product'}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => router.push(`/products/${id}`)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}