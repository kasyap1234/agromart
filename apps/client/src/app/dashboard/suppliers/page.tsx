'use client'

import * as React from 'react'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, MoreHorizontal, Edit, Eye, Trash2, Building, Phone, Mail, MapPin } from 'lucide-react'
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

import SupplierFormDialog from './SupplierFormDialog'

interface Supplier {
  id: string
  name: string
  contact_person?: string
  email?: string
  phone?: string
  address?: string
  tax_id?: string
  payment_mode?: string
  status: 'active' | 'inactive'
  total_purchases: number
  last_order_date?: string
  created_at: string
  updated_at: string
}

interface SuppliersResponse {
  data: Supplier[]
  pagination: {
    currentPage: number
    totalPages: number
    totalCount: number
    limit: number
    hasNext: boolean
    hasPrevious: boolean
  }
}

export default function SuppliersPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  
  // State management
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  
  // Build query params
  const queryParams = {
    page,
    limit,
    search: search.trim(),
    status: statusFilter !== 'all' ? statusFilter : undefined,
    sortBy,
    sortOrder
  }
  
  // Fetch suppliers data
  const { data, error, isLoading } = useSWR<SuppliersResponse>(
    ['/suppliers', queryParams],
    () => apiClient.suppliers.list(queryParams),
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

  const handleEdit = useCallback((supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setShowEditDialog(true)
  }, [])

  const handleDelete = useCallback((supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setShowDeleteDialog(true)
  }, [])

  const handleView = useCallback((supplier: Supplier) => {
    router.push(`/dashboard/suppliers/${supplier.id}`)
  }, [router])

  const performDelete = useCallback(async () => {
    if (!selectedSupplier) return

    try {
      await apiClient.suppliers.delete(selectedSupplier.id)
      toast({
        title: 'Success',
        description: 'Supplier deleted successfully',
      })
      mutate(['/suppliers', queryParams])
      setShowDeleteDialog(false)
      setSelectedSupplier(null)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete supplier',
        variant: 'destructive'
      })
    }
  }, [selectedSupplier, queryParams, toast])

  const handleFormSuccess = useCallback(() => {
    mutate(['/suppliers', queryParams])
    setShowCreateDialog(false)
    setShowEditDialog(false)
    setSelectedSupplier(null)
  }, [queryParams])

  // Table columns
  const columns = [
    {
      key: 'name',
      title: 'Supplier',
      sortable: true,
      render: (supplier: Supplier) => (
        <div>
          <div className="font-medium">{supplier.name}</div>
          {supplier.contact_person && (
            <div className="text-sm text-muted-foreground">
              Contact: {supplier.contact_person}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'contact',
      title: 'Contact Information',
      render: (supplier: Supplier) => (
        <div className="space-y-1">
          {supplier.email && (
            <div className="flex items-center gap-1 text-sm">
              <Mail className="h-3 w-3" />
              {supplier.email}
            </div>
          )}
          {supplier.phone && (
            <div className="flex items-center gap-1 text-sm">
              <Phone className="h-3 w-3" />
              {supplier.phone}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'address',
      title: 'Location',
      render: (supplier: Supplier) => (
        <div className="text-sm">
          {supplier.address ? (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span className="truncate max-w-48">{supplier.address}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">No address</span>
          )}
        </div>
      )
    },
    {
      key: 'total_purchases',
      title: 'Total Purchases',
      sortable: true,
      render: (supplier: Supplier) => (
        <div className="font-medium">₹{supplier.total_purchases.toFixed(2)}</div>
      )
    },
    {
      key: 'payment_mode',
      title: 'Payment Mode',
      render: (supplier: Supplier) => (
        <div className="text-sm">
          {supplier.payment_mode ? (
            <Badge variant="outline">{supplier.payment_mode}</Badge>
          ) : (
            <span className="text-muted-foreground">Not specified</span>
          )}
        </div>
      )
    },
    {
      key: 'last_order_date',
      title: 'Last Order',
      render: (supplier: Supplier) => (
        <div className="text-sm">
          {supplier.last_order_date ? (
            new Date(supplier.last_order_date).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })
          ) : (
            <span className="text-muted-foreground">No orders</span>
          )}
        </div>
      )
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      render: (supplier: Supplier) => (
        <Badge variant={supplier.status === 'active' ? 'success' : 'secondary'}>
          {supplier.status}
        </Badge>
      )
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (supplier: Supplier) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handleView(supplier)}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            {canWrite && (
              <DropdownMenuItem onClick={() => handleEdit(supplier)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Supplier
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {canDelete && (
              <DropdownMenuItem 
                className="text-red-600"
                onClick={() => handleDelete(supplier)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Supplier
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
          <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-muted-foreground">
            Manage your supplier relationships and procurement sources
          </p>
        </div>
        {canWrite && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Supplier
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Suppliers</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.pagination.totalCount || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Suppliers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {data?.data.filter(s => s.status === 'active').length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ₹{(data?.data.reduce((sum, s) => sum + s.total_purchases, 0) || 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {data?.data.filter(s => s.last_order_date && 
                new Date(s.last_order_date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
              ).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
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
                placeholder="Search suppliers by name, contact, or email..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9"
              />
            </div>

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
        emptyMessage="No suppliers found"
      />

      {/* Dialogs */}
      {showCreateDialog && (
        <SupplierFormDialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onSuccess={handleFormSuccess}
        />
      )}

      {showEditDialog && selectedSupplier && (
        <SupplierFormDialog
          open={showEditDialog}
          onClose={() => {
            setShowEditDialog(false)
            setSelectedSupplier(null)
          }}
          onSuccess={handleFormSuccess}
          supplier={selectedSupplier}
        />
      )}

      {showDeleteDialog && selectedSupplier && (
        <DeleteConfirmationDialog
          open={showDeleteDialog}
          onClose={() => {
            setShowDeleteDialog(false)
            setSelectedSupplier(null)
          }}
          onConfirm={performDelete}
          title="Delete Supplier"
          description={`Are you sure you want to delete "${selectedSupplier.name}"? This action cannot be undone and will remove all associated data.`}
        />
      )}
    </div>
  )
}
