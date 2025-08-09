"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import useSWR from 'swr';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [price, setPrice] = useState<number | ''>('');
  const [brand, setBrand] = useState('');
  const [description, setDescription] = useState('');
  const [unitId, setUnitId] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState<number | ''>('');
  const [gstPercent, setGstPercent] = useState<number | ''>('');
  const [submitting, setSubmitting] = useState(false);

  const product = (productData as any)?.data || productData;
  const units = (unitsData as any)?.data || unitsData;

  useEffect(() => {
    if (product) {
      setSku(product.sku || '');
      setName(product.name || '');
      setPrice(product.price || '');
      setBrand(product.brand || '');
      setDescription(product.description || '');
      setUnitId(product.unit_id || '');
      setPricePerUnit(product.price_per_unit || '');
      setGstPercent(product.gst_percent || '');
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
        price: Number(price),
        description: description || undefined,
        brand: brand || undefined,
        unit_id: unitId,
        price_per_unit: Number(pricePerUnit),
        gst_percent: gstPercent === '' ? undefined : Number(gstPercent),
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
            <select 
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={unitId} 
              onChange={e => setUnitId(e.target.value)} 
              required
            >
              {(units || []).map((u: Unit) => (
                <option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>
              ))}
            </select>
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