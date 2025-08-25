"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { Edit, Eye, Trash2, Plus, User, Mail, Phone } from 'lucide-react';
import { DataTable, DataTableColumn, DataTableAction, defaultActions } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';

// Types following TypeScript best practices
interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  is_active: boolean;
  customer_type: 'individual' | 'business';
  tax_id?: string;
  credit_limit?: number;
  payment_terms?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface CustomersDataTableProps {
  customers: Customer[];
  loading?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  onPaginationChange?: (page: number, limit: number) => void;
  onSort?: (key: keyof Customer | string, direction: 'asc' | 'desc') => void;
  onFilter?: (filters: Record<string, any>) => void;
  onSearch?: (query: string) => void;
  onRefresh?: () => void;
  onExport?: () => void;
  onDelete?: (customer: Customer) => Promise<void>;
}

// Constants moved outside component for performance
const CUSTOMER_TYPE_OPTIONS = [
  { label: 'Individual', value: 'individual' },
  { label: 'Business', value: 'business' },
] as const;

const ACTIVE_STATUS_OPTIONS = [
  { label: 'Active', value: true },
  { label: 'Inactive', value: false },
] as const;

export function CustomersDataTable({
  customers,
  loading = false,
  pagination,
  onPaginationChange,
  onSort,
  onFilter,
  onSearch,
  onRefresh,
  onExport,
  onDelete,
}: CustomersDataTableProps) {
  const router = useRouter();
  const {
    canViewCustomers,
    canEditCustomers,
    canDeleteCustomers,
    canCreateCustomers,
  } = usePermissions();

  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Event handlers following React best practices
  const handleView = useCallback((customer: Customer) => {
    router.push(`/customers/${customer.id}`);
  }, [router]);

  const handleEdit = useCallback((customer: Customer) => {
    router.push(`/customers/${customer.id}/edit`);
  }, [router]);

  const handleDelete = useCallback(async (customer: Customer) => {
    if (!canDeleteCustomers) {
      toast.error('You do not have permission to delete customers');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${customer.name}"?`)) {
      return;
    }

    setDeletingId(customer.id);
    try {
      await onDelete?.(customer);
      toast.success('Customer deleted successfully');
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error('Failed to delete customer');
    } finally {
      setDeletingId(null);
    }
  }, [canDeleteCustomers, onDelete]);

  const handleCreate = useCallback(() => {
    router.push('/customers/new');
  }, [router]);

  // Define columns with proper TypeScript typing
  const columns: DataTableColumn<Customer>[] = useMemo(() => [
    {
      key: 'name',
      label: 'Customer',
      sortable: true,
      searchable: true,
      render: (value: string, customer: Customer) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{value}</div>
            {customer.email && (
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {customer.email}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      sortable: true,
      render: (value: string) => value ? (
        <div className="flex items-center gap-1 text-sm">
          <Phone className="h-3 w-3 text-muted-foreground" />
          {value}
        </div>
      ) : '—',
    },
    {
      key: 'customer_type',
      label: 'Type',
      sortable: true,
      filterable: true,
      filterOptions: CUSTOMER_TYPE_OPTIONS,
      render: (value: string) => (
        <Badge variant="outline" className="capitalize">
          {value}
        </Badge>
      ),
    },
    {
      key: 'address',
      label: 'Location',
      render: (value: string, customer: Customer) => {
        const location = [customer.city, customer.state, customer.country]
          .filter(Boolean)
          .join(', ');
        return location || '—';
      },
    },
    {
      key: 'credit_limit',
      label: 'Credit Limit',
      sortable: true,
      align: 'right',
      render: (value: number) => value ? (
        <span className="font-mono">${value.toLocaleString()}</span>
      ) : '—',
    },
    {
      key: 'payment_terms',
      label: 'Payment Terms',
      sortable: true,
      align: 'center',
      render: (value: number) => value ? (
        <span className="text-sm">{value} days</span>
      ) : '—',
    },
    {
      key: 'is_active',
      label: 'Status',
      sortable: true,
      filterable: true,
      filterOptions: ACTIVE_STATUS_OPTIONS,
      render: (value: boolean) => (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (value: string) => (
        <span className="text-sm text-muted-foreground">
          {format(parseISO(value), 'MMM d, yyyy')}
        </span>
      ),
    },
  ], []);

  // Define actions with proper permissions
  const actions: DataTableAction<Customer>[] = useMemo(() => {
    const actionList: DataTableAction<Customer>[] = [];

    if (canViewCustomers) {
      actionList.push(defaultActions.view(handleView));
    }

    if (canEditCustomers) {
      actionList.push(defaultActions.edit(handleEdit));
    }

    if (canDeleteCustomers) {
      actionList.push({
        ...defaultActions.delete(handleDelete),
        disabled: (customer) => deletingId === customer.id,
      });
    }

    return actionList;
  }, [canViewCustomers, canEditCustomers, canDeleteCustomers, handleView, handleEdit, handleDelete, deletingId]);

  // Custom export function
  const handleExport = useCallback(() => {
    if (!onExport) {
      // Default export implementation
      const csvContent = [
        // Headers
        ['Name', 'Email', 'Phone', 'Type', 'Address', 'City', 'State', 'Country', 'Credit Limit', 'Payment Terms', 'Status', 'Created'].join(','),
        // Data rows
        ...customers.map(customer => [
          customer.name,
          customer.email || '',
          customer.phone || '',
          customer.customer_type,
          customer.address || '',
          customer.city || '',
          customer.state || '',
          customer.country || '',
          customer.credit_limit || '',
          customer.payment_terms || '',
          customer.is_active ? 'Active' : 'Inactive',
          format(parseISO(customer.created_at), 'yyyy-MM-dd'),
        ].map(value => {
          const stringValue = String(value);
          return stringValue.includes(',') || stringValue.includes('\"') 
            ? `\"${stringValue.replace(/\"/g, '\"\"')}\"`
            : stringValue;
        }).join(',')),
      ].join('\\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `customers-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Customers exported successfully');
    } else {
      onExport();
    }
  }, [onExport, customers]);

  if (!canViewCustomers) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">You do not have permission to view customers.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with create button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Customers</h2>
          <p className="text-gray-600">Manage your customer relationships</p>
        </div>
        {canCreateCustomers && (
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Customer
          </Button>
        )}
      </div>

      {/* Data Table */}
      <DataTable
        data={customers}
        columns={columns}
        actions={actions}
        pagination={pagination}
        onPaginationChange={onPaginationChange}
        onSort={onSort}
        onFilter={onFilter}
        onSearch={onSearch}
        onRefresh={onRefresh}
        onExport={handleExport}
        loading={loading}
        searchPlaceholder="Search customers by name, email, or phone..."
        emptyMessage="No customers found. Add your first customer to get started."
        getRowId={(customer) => customer.id}
      />
    </div>
  );
}