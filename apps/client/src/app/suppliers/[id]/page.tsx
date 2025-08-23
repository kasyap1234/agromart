"use client";

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from 'react-hot-toast';
import { Pencil, Trash2, ArrowLeft } from "lucide-react";
import { apiClient } from '@/lib/api';
import Link from "next/link";
import { DetailItem } from '@/components/ui/DetailItem';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  created_at: string;
}

export default function SupplierDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params?.id) ? params?.id[0] : (params as any)?.id;
  const { data, error, isLoading, mutate } = useSWR<Supplier>(id ? [`/suppliers/${id}`] : null, () => apiClient.suppliers.get(String(id)) as Promise<Supplier>);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const supplier = (data as any)?.data || data;

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await apiClient.suppliers.delete(String(id));
      toast.success('Supplier deleted successfully');
      router.push('/suppliers');
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to delete supplier';
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
            <div className="text-red-500 mb-4">Failed to load supplier.</div>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => mutate()}>
                Retry
              </Button>
              <Button variant="outline" asChild>
                <Link href="/suppliers">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Suppliers
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
            <Link href="/suppliers">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Supplier Details</h1>
            <p className="text-muted-foreground">View and manage supplier information</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button asChild variant="outline">
            <Link href={`/suppliers/${id}/edit`}>
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

      {supplier && (
        <Card>
          <CardHeader>
            <CardTitle>{supplier.name}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Contact Information</h3>
              <div className="space-y-3">
                <DetailItem label="Name" value={supplier.name} />
                <DetailItem label="Email" value={supplier.email || '-'} />
                <DetailItem label="Phone" value={supplier.phone || '-'} />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Address Information</h3>
              <div className="space-y-3">
                <DetailItem label="Address" value={supplier.address || 'No address provided'} />
              </div>
            </div>

            <div className="md:col-span-2">
              <h3 className="text-lg font-medium mb-4">Additional Information</h3>
              <div className="space-y-3">
                <DetailItem
                  label="Created At"
                  value={supplier.created_at ? new Date(supplier.created_at).toLocaleDateString() : 'Unknown'}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Supplier"
        description={`Are you sure you want to delete "${supplier?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}