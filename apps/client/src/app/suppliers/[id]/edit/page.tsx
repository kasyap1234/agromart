"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import useSWR from 'swr';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from 'react-hot-toast';
import { ArrowLeft } from "lucide-react";
import { apiClient } from '@/lib/api';
import Link from "next/link";

interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  created_at: string;
}

export default function EditSupplierPage() {
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params?.id) ? params?.id[0] : (params as any)?.id;

  const { data: supplierData, error: supplierError, isLoading: supplierLoading } = useSWR(
    id ? [`/suppliers/${id}`] : null,
    () => apiClient.suppliers.get(String(id))
  );

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const supplier = (supplierData as any)?.data || supplierData;

  useEffect(() => {
    if (supplier) {
      setName(supplier.name || '');
      setEmail(supplier.email || '');
      setPhone(supplier.phone || '');
      setAddress(supplier.address || '');
    }
  }, [supplier]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      toast.error('Name is required');
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.suppliers.update(String(id), {
        name,
        email: email || undefined,
        phone: phone || undefined,
        address: address || undefined,
      });
      toast.success('Supplier updated successfully');
      router.push(`/suppliers/${id}`);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to update supplier';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (supplierLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (supplierError) {
    return (
      <div className="py-8 text-red-600">
        Failed to load supplier data.
        <div className="flex gap-2 mt-2">
          <Button variant="outline" onClick={() => router.refresh()}>
            Retry
          </Button>
          <Button variant="outline" asChild>
            <Link href="/suppliers">
              Back to Suppliers
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/suppliers/${id}`}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Supplier</h1>
          <p className="text-muted-foreground">Update supplier information</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="max-w-2xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <Input
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Address</label>
            <Textarea
              rows={3}
              value={address}
              onChange={e => setAddress(e.target.value)}
            />
          </div>
        </div>
        <div className="flex space-x-2 pt-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Updating...' : 'Update Supplier'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/suppliers/${id}`)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}