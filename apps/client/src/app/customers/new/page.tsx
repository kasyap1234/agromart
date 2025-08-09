"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { apiClient } from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function NewCustomerPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return toast.error('Name is required');
    try {
      setSaving(true);
      await apiClient.customers.create({ name, email, phone, address } as any);
      toast.success('Customer created');
      router.push('/customers');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to create customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout title="New Customer">
      <form onSubmit={onSubmit} className="max-w-lg space-y-4">
        <div>
          <label className="block text-sm font-medium">Name</label>
          <input className="input mt-1 w-full" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input className="input mt-1 w-full" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium">Phone</label>
          <input className="input mt-1 w-full" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium">Address</label>
          <textarea className="input mt-1 w-full" rows={3} value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </DashboardLayout>
  );
}
