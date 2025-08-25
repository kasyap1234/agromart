"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import useSWR from 'swr';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from 'react-hot-toast';
import { ArrowLeft, Save, X } from "lucide-react";
import { apiClient } from '@/lib/api';
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Customer {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  payment_mode?: string;
  is_active?: boolean;
  created_at: string;
}

const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'credit', label: 'Credit' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'upi', label: 'UPI' },
  { value: 'net_banking', label: 'Net Banking' },
];

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params?.id) ? params?.id[0] : (params as any)?.id;

  const { data: customerData, error: customerError, isLoading: customerLoading } = useSWR(
    id ? [`/customers/${id}`] : null,
    () => apiClient.customers.get(String(id))
  );

  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const customer = (customerData as any)?.data || customerData;

  useEffect(() => {
    if (customer) {
      setName(customer.name || '');
      setContactPerson(customer.contact_person || '');
      setEmail(customer.email || '');
      setPhone(customer.phone || '');
      setAddress(customer.address || '');
      setPaymentMode(customer.payment_mode || '');
      setIsActive(customer.is_active !== false);
    }
  }, [customer]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Customer name is required');
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.customers.update(String(id), {
        name: name.trim(),
        contact_person: contactPerson.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        payment_mode: paymentMode || undefined,
        is_active: isActive,
      });
      toast.success('Customer updated successfully');
      router.push(`/customers/${id}`);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to update customer';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (customerLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (customerError) {
    return (
      <div className="py-8">
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-red-500 mb-4">Failed to load customer data.</div>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => router.refresh()}>
                Retry
              </Button>
              <Button variant="outline" asChild>
                <Link href="/customers">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Customers
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/customers/${id}`}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Customer</h1>
          <p className="text-muted-foreground">Update customer information and settings</p>
        </div>
      </div>

      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Customer Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter customer name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_person">Contact Person</Label>
                <Input
                  id="contact_person"
                  value={contactPerson}
                  onChange={e => setContactPerson(e.target.value)}
                  placeholder="Enter contact person name"
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter email address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                rows={3}
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Enter customer address"
              />
            </div>

            {/* Payment and Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment_mode">Payment Mode</Label>
                <Select value={paymentMode} onValueChange={setPaymentMode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_MODES.map((mode) => (
                      <SelectItem key={mode.value} value={mode.value}>
                        {mode.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="is_active">Customer Status</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                  <Label htmlFor="is_active" className="text-sm text-muted-foreground">
                    {isActive ? 'Active' : 'Inactive'}
                  </Label>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex space-x-3 pt-4 border-t">
              <Button type="submit" disabled={submitting}>
                <Save className="w-4 h-4 mr-2" />
                {submitting ? 'Updating...' : 'Update Customer'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/customers/${id}`)}
                disabled={submitting}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}