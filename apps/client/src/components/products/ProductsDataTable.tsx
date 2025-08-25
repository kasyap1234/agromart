"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { Edit, Eye, Trash2, Plus, Package } from 'lucide-react';
import { DataTable, DataTableColumn, DataTableAction, defaultActions } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';

// Types following TypeScript best practices
interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit_name?: string;
  min_stock_level: number;
  max_stock_level: number;
  reorder_point: number;
  cost_price: number;
  selling_price: number;
  tax_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ProductsDataTableProps {
  products: Product[];
  loading?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  onPaginationChange?: (page: number, limit: number) => void;
  onSort?: (key: keyof Product | string, direction: 'asc' | 'desc') => void;
  onFilter?: (filters: Record<string, any>) => void;
  onSearch?: (query: string) => void;
  onRefresh?: () => void;
  onExport?: () => void;
  onDelete?: (product: Product) => Promise<void>;
}

// Constants moved outside component for performance
const PRODUCT_CATEGORIES = [
  { label: 'Electronics', value: 'electronics' },
  { label: 'Clothing', value: 'clothing' },
  { label: 'Food & Beverages', value: 'food_beverages' },
  { label: 'Home & Garden', value: 'home_garden' },
  { label: 'Books', value: 'books' },
  { label: 'Sports', value: 'sports' },
  { label: 'Automotive', value: 'automotive' },
  { label: 'Health & Beauty', value: 'health_beauty' },
  { label: 'Other', value: 'other' },
] as const;

const ACTIVE_STATUS_OPTIONS = [
  { label: 'Active', value: true },
  { label: 'Inactive', value: false },
] as const;

export function ProductsDataTable({
  products,
  loading = false,
  pagination,
  onPaginationChange,
  onSort,
  onFilter,
  onSearch,
  onRefresh,
  onExport,
  onDelete,
}: ProductsDataTableProps) {
  const router = useRouter();
  const {
    canViewProducts,
    canEditProducts,
    canDeleteProducts,
    canCreateProducts,
  } = usePermissions();

  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Event handlers following React best practices
  const handleView = useCallback((product: Product) => {
    router.push(`/products/${product.id}`);
  }, [router]);

  const handleEdit = useCallback((product: Product) => {
    router.push(`/products/${product.id}/edit`);
  }, [router]);

  const handleDelete = useCallback(async (product: Product) => {
    if (!canDeleteProducts) {
      toast.error('You do not have permission to delete products');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${product.name}"?`)) {
      return;
    }

    setDeletingId(product.id);
    try {
      await onDelete?.(product);
      toast.success('Product deleted successfully');
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    } finally {
      setDeletingId(null);
    }
  }, [canDeleteProducts, onDelete]);

  const handleCreate = useCallback(() => {
    router.push('/products/new');
  }, [router]);

  // Define columns with proper TypeScript typing
  const columns: DataTableColumn<Product>[] = useMemo(() => [
    {
      key: 'name',
      label: 'Product Name',
      sortable: true,
      searchable: true,
      render: (value: string, product: Product) => (
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{value}</div>
            <div className="text-sm text-muted-foreground">{product.sku}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      sortable: true,
      filterable: true,
      filterOptions: PRODUCT_CATEGORIES,
      render: (value: string) => (
        <Badge variant="outline" className="capitalize">
          {value.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'unit_name',
      label: 'Unit',
      sortable: true,
      render: (value: string) => value || '—',
    },
    {
      key: 'cost_price',
      label: 'Cost Price',
      sortable: true,
      align: 'right',
      render: (value: number) => (
        <span className="font-mono">${value.toFixed(2)}</span>
      ),
    },
    {
      key: 'selling_price',
      label: 'Selling Price',
      sortable: true,
      align: 'right',
      render: (value: number) => (
        <span className="font-mono font-medium">${value.toFixed(2)}</span>
      ),
    },
    {
      key: 'min_stock_level',
      label: 'Min Stock',
      sortable: true,
      align: 'center',
      render: (value: number) => (
        <span className="font-mono">{value}</span>
      ),
    },
    {
      key: 'reorder_point',
      label: 'Reorder Point',
      sortable: true,
      align: 'center',
      render: (value: number) => (
        <span className="font-mono">{value}</span>
      ),
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
  const actions: DataTableAction<Product>[] = useMemo(() => {
    const actionList: DataTableAction<Product>[] = [];

    if (canViewProducts) {
      actionList.push(defaultActions.view(handleView));
    }

    if (canEditProducts) {
      actionList.push(defaultActions.edit(handleEdit));
    }

    if (canDeleteProducts) {
      actionList.push({
        ...defaultActions.delete(handleDelete),
        disabled: (product) => deletingId === product.id,
      });
    }

    return actionList;
  }, [canViewProducts, canEditProducts, canDeleteProducts, handleView, handleEdit, handleDelete, deletingId]);

  // Custom export function
  const handleExport = useCallback(() => {
    if (!onExport) {
      // Default export implementation
      const csvContent = [
        // Headers
        columns.map(col => col.label).join(','),
        // Data rows
        ...products.map(product =>
          columns.map(col => {
            const value = product[col.key as keyof Product];
            // Escape commas and quotes in CSV
            const stringValue = String(value || '');
            return stringValue.includes(',') || stringValue.includes('\"') 
              ? `\"${stringValue.replace(/\"/g, '\"\"')}\"`
              : stringValue;
          }).join(',')
        ),
      ].join('\\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `products-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Products exported successfully');
    } else {
      onExport();
    }
  }, [onExport, columns, products]);

  if (!canViewProducts) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">You do not have permission to view products.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with create button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Products</h2>
          <p className="text-gray-600">Manage your product catalog</p>
        </div>
        {canCreateProducts && (
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        )}
      </div>

      {/* Data Table */}
      <DataTable
        data={products}
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
        searchPlaceholder="Search products by name or SKU..."
        emptyMessage="No products found. Create your first product to get started."
        getRowId={(product) => product.id}
      />
    </div>
  );
}