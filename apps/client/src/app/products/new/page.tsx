"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { apiClient } from '@/lib/api';
import { toast } from 'react-hot-toast';

interface Unit { id: string; name: string; abbreviation: string }

export default function NewProductPage() {
  const router = useRouter();
  const { data: units } = useSWR<Unit[]>(['/units'], () => apiClient.units.list() as Promise<any>);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [brand, setBrand] = useState('');
  const [description, setDescription] = useState('');
  const [unitId, setUnitId] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState<number | ''>('');
  const [gstPercent, setGstPercent] = useState<number | ''>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (units && units.length > 0 && !unitId) {
      setUnitId(units[0].id);
    }
  }, [units, unitId]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku || !name || !price || !unitId || !pricePerUnit) {
      toast.error('SKU, Name, Price, Unit and Price per unit are required');
      return;
    }
    try {
      setSubmitting(true);
      const product = await apiClient.products.create({
        sku,
        name,
        price: Number(price),
        description: description || undefined,
        image_url: undefined,
        brand: brand || undefined,
        unit_id: unitId,
        price_per_unit: Number(pricePerUnit),
        gst_percent: gstPercent === '' ? undefined : Number(gstPercent),
      } as any);
      const id = (product as any)?.data?.id || (product as any)?.id;
      toast.success('Product created');
      if (id) router.push(`/products/${id}`);
      else router.push('/products');
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to create product';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout title="New Product">
      <form onSubmit={onSubmit} className="max-w-2xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">SKU</label>
            <input className="mt-1 input" value={sku} onChange={e => setSku(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium">Name</label>
            <input className="mt-1 input" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium">Price</label>
            <input type="number" className="mt-1 input" value={price} onChange={e => setPrice(e.target.value === '' ? '' : Number(e.target.value))} required />
          </div>
          <div>
            <label className="block text-sm font-medium">Brand</label>
            <input className="mt-1 input" value={brand} onChange={e => setBrand(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium">Unit</label>
            <select className="mt-1 input" value={unitId} onChange={e => setUnitId(e.target.value)} required>
              {(units || []).map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Price per unit</label>
            <input type="number" className="mt-1 input" value={pricePerUnit} onChange={e => setPricePerUnit(e.target.value === '' ? '' : Number(e.target.value))} required />
          </div>
          <div>
            <label className="block text-sm font-medium">GST %</label>
            <input type="number" className="mt-1 input" value={gstPercent} onChange={e => setGstPercent(e.target.value === '' ? '' : Number(e.target.value))} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium">Description</label>
            <textarea className="mt-1 input" rows={4} value={description} onChange={e => setDescription(e.target.value)} />
          </div>
        </div>
        <div className="pt-2">
          <button type="submit" disabled={submitting} className="btn btn-primary">
            {submitting ? 'Creating...' : 'Create product'}
          </button>
        </div>
      </form>
    </DashboardLayout>
  );
}
