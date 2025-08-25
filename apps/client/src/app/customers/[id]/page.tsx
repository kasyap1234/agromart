"use client";

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from 'react-hot-toast';
import { Pencil, Trash2, ArrowLeft, User, Mail, Phone, MapPin, Calendar, Plus, FileText } from "lucide-react";
import { apiClient } from '@/lib/api';
import Link from "next/link";
import { DetailItem } from '@/components/ui/DetailItem';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

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
  updated_at?: string;
}

export default function CustomerDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params?.id) ? params?.id[0] : (params as any)?.id;
  const { data, error, isLoading, mutate } = useSWR<Customer>(
    id ? [`/customers/${id}`] : null, 
    () => apiClient.customers.get(String(id)) as Promise<Customer>
  );
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const customer = (data as any)?.data || data;

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await apiClient.customers.delete(String(id));
      toast.success('Customer deleted successfully');
      router.push('/customers');
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to delete customer';
      toast.error(message);
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (!id) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8">
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-red-500 mb-4">Failed to load customer.</div>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => mutate()}>
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/customers">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Customer Details</h1>
            <p className="text-muted-foreground">View and manage customer information</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button asChild variant="outline">
            <Link href={`/customers/${id}/edit`}>
              <Pencil className="w-4 h-4 mr-2" aria-hidden="true" />
              Edit
            </Link>
          </Button>
          <Button
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
            disabled={deleting}
          >
            <Trash2 className="w-4 h-4 mr-2" aria-hidden="true" />
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>

      {customer && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Customer Information */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  {customer.name}
                  {customer.is_active === false && (
                    <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
                      Inactive
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DetailItem label="Name" value={customer.name} />
                    <DetailItem label="Contact Person" value={customer.contact_person || '-'} />
                    <DetailItem label="Email" value={customer.email || '-'} />
                    <DetailItem label="Phone" value={customer.phone || '-'} />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Address & Payment
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DetailItem 
                      label="Address" 
                      value={customer.address || 'No address provided'} 
                      className="md:col-span-2"
                    />
                    <DetailItem label="Payment Mode" value={customer.payment_mode || 'Not specified'} />
                    <DetailItem 
                      label="Status" 
                      value={customer.is_active === false ? 'Inactive' : 'Active'}
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Timeline
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DetailItem
                      label="Created At"
                      value={customer.created_at ? new Date(customer.created_at).toLocaleDateString() : 'Unknown'}
                    />
                    <DetailItem
                      label="Last Updated"
                      value={customer.updated_at ? new Date(customer.updated_at).toLocaleDateString() : 'Not updated'}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions & Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button asChild variant="outline" size="sm" className="w-full justify-start">
                  <Link href={`/customers/${id}/edit`}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit Customer
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="w-full justify-start">
                  <Link href={`/sales-orders/new?customer_id=${id}`}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Sale Order
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="w-full justify-start">
                  <Link href={`/sales-orders?customer_id=${id}`}>
                    <FileText className="w-4 h-4 mr-2" />
                    View Orders
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Customer Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <span className={customer.is_active === false ? 'text-red-600' : 'text-green-600'}>
                    {customer.is_active === false ? 'Inactive' : 'Active'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Has Email</span>
                  <span>{customer.email ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Has Phone</span>
                  <span>{customer.phone ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Has Address</span>
                  <span>{customer.address ? 'Yes' : 'No'}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Customer"
        description={`Are you sure you want to delete "${customer?.name}"? This action cannot be undone and will affect any related sales orders.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}