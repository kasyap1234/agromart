'use client'

import * as React from 'react'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Filter, MoreHorizontal, Edit, Eye, Trash2, Package } from 'lucide-react'
import useSWR, { mutate } from 'swr'

import { apiClient } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable } from '@/components/ui/data-table'
import { DeleteConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { useToast } from '@/hooks/use-toast'

import ProductFormDialog from './ProductFormDialog'

interface Product {
  id: string
  name: string
  sku: string
  description?: string
  category: string
  price: number
  unit: string
  status: 'active' | 'inactive'
  stockQuantity: number
  minStockLevel: number
  supplier?: {
    id: string
    name: string
  }
  createdAt: string
  updatedAt: string
}

interface ProductsResponse {
  data: Product[]
  pagination: {
    currentPage: number
    totalPages: number
    totalCount: number
    limit: number
    hasNext: boolean
    hasPrevious: boolean
  }
}

const PRODUCT_CATEGORIES = [
  'Seeds',
  'Fertilizers', 
  'Pesticides',
  'Tools',
  'Equipment',
  'Organic',
  'Others'
]

const PRODUCT_UNITS = [
  'kg',
  'lbs',
  'pieces',
  'liters',
  'gallons',
  'bags',
  'boxes'
]

export default function ProductsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  
  // State management
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  
  // Build query params
  const queryParams = {
    page,
    limit,
    search: search.trim(),
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    sortBy,
    sortOrder
  }
  
  // Fetch products data
  const { data, error, isLoading } = useSWR<ProductsResponse>(
    ['/products', queryParams],
    () => apiClient.products.list(queryParams),
    {
      keepPreviousData: true,
      revalidateOnFocus: false
    }
  )

  // Permissions
  const canWrite = user?.role === 'admin' || user?.role === 'manager'
  const canDelete = user?.role === 'admin'

  // Handlers
  const handleSearch = useCallback((value: string) => {
    setSearch(value)
    setPage(1) // Reset to first page on search
  }, [])

  const handleSort = useCallback((field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
    setPage(1)
  }, [sortBy, sortOrder])

  const handleEdit = useCallback((product: Product) => {
    setSelectedProduct(product)
    setShowEditDialog(true)
  }, [])

  const handleDelete = useCallback((product: Product) => {
    setSelectedProduct(product)
    setShowDeleteDialog(true)
  }, [])

  const handleView = useCallback((product: Product) => {
    router.push(`/dashboard/products/${product.id}`)
  }, [router])

  const performDelete = useCallback(async () => {
    if (!selectedProduct) return

    try {
      await apiClient.products.delete(selectedProduct.id)
      toast({
        title: 'Success',
        description: 'Product deleted successfully',
      })
      mutate(['/products', queryParams])
      setShowDeleteDialog(false)
      setSelectedProduct(null)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete product',
        variant: 'destructive'
      })
    }
  }, [selectedProduct, queryParams, toast])

  const handleFormSuccess = useCallback(() => {
    mutate(['/products', queryParams])
    setShowCreateDialog(false)
    setShowEditDialog(false)
    setSelectedProduct(null)
  }, [queryParams])

  // Table columns
  const columns = [
    {
      key: 'sku',
      title: 'SKU',
      sortable: true,
      render: (product: Product) => (
        <div className="font-medium">{product.sku}</div>
      )
    },
    {
      key: 'name',
      title: 'Product Name',
      sortable: true,
      render: (product: Product) => (
        <div>
          <div className="font-medium">{product.name}</div>
          {product.description && (
            <div className="text-sm text-muted-foreground truncate max-w-48">
              {product.description}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'category',
      title: 'Category',
      sortable: true,
      render: (product: Product) => (
        <Badge variant="secondary">{product.category}</Badge>
      )
    },
    {
      key: 'price',
      title: 'Price',
      sortable: true,
      render: (product: Product) => (
        <div className="font-medium">₹{product.price.toFixed(2)}/{product.unit}</div>
      )
    },
    {
      key: 'stockQuantity',
      title: 'Stock',
      sortable: true,
      render: (product: Product) => (
        <div className="space-y-1">
          <div className="font-medium">{product.stockQuantity} {product.unit}</div>
          {product.stockQuantity <= product.minStockLevel && (
            <Badge variant="destructive" className="text-xs">Low Stock</Badge>
          )}
        </div>
      )
    },
    {
      key: 'supplier',
      title: 'Supplier',
      render: (product: Product) => (
        <div className="text-sm">
          {product.supplier?.name || 'No supplier'}
        </div>
      )
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      render: (product: Product) => (
        <Badge variant={product.status === 'active' ? 'success' : 'secondary'}>
          {product.status}
        </Badge>
      )
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (product: Product) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handleView(product)}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            {canWrite && (
              <DropdownMenuItem onClick={() => handleEdit(product)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Product
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {canDelete && (
              <DropdownMenuItem 
                className="text-red-600"
                onClick={() => handleDelete(product)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Product
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">
            Manage your inventory and product catalog
          </p>
        </div>
        {canWrite && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.pagination.totalCount || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {data?.data.filter(p => p.status === 'active').length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {data?.data.filter(p => p.stockQuantity <= p.minStockLevel).length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(data?.data.map(p => p.category)).size || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products by name, SKU, or description..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {PRODUCT_CATEGORIES.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <DataTable
        data={data?.data || []}
        columns={columns}
        loading={isLoading}
        error={error}
        pagination={data?.pagination}
        onPageChange={setPage}
        onLimitChange={setLimit}
        onSort={handleSort}
        sortBy={sortBy}
        sortOrder={sortOrder}
        emptyMessage="No products found"
      />

      {/* Dialogs */}
      {showCreateDialog && (
        <ProductFormDialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onSuccess={handleFormSuccess}
          categories={PRODUCT_CATEGORIES}
          units={PRODUCT_UNITS}
        />
      )}

      {showEditDialog && selectedProduct && (
        <ProductFormDialog
          open={showEditDialog}
          onClose={() => {
            setShowEditDialog(false)
            setSelectedProduct(null)
          }}
          onSuccess={handleFormSuccess}
          product={selectedProduct}
          categories={PRODUCT_CATEGORIES}
          units={PRODUCT_UNITS}
        />
      )}

      {showDeleteDialog && selectedProduct && (
        <DeleteConfirmationDialog
          open={showDeleteDialog}
          onClose={() => {
            setShowDeleteDialog(false)
            setSelectedProduct(null)
          }}
          onConfirm={performDelete}
          title="Delete Product"
          description={`Are you sure you want to delete "${selectedProduct.name}"? This action cannot be undone.`}
        />
      )}
    </div>
  )
}
