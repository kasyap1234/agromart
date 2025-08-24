'use client'

import * as React from 'react'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, MoreHorizontal, Edit, Eye, Trash2, Users, Phone, Mail, MapPin } from 'lucide-react'
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

import CustomerFormDialog from './CustomerFormDialog'

interface Customer {
  id: string
  name: string
  email?: string
  phone?: string
  company?: string
  address?: {
    street?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
  }
  customerType: 'individual' | 'business'
  status: 'active' | 'inactive'
  creditLimit?: number
  outstandingBalance: number
  totalOrders: number
  totalSpent: number
  lastOrderDate?: string
  createdAt: string
  updatedAt: string
}

interface CustomersResponse {
  data: Customer[]
  pagination: {
    currentPage: number
    totalPages: number
    totalCount: number
    limit: number
    hasNext: boolean
    hasPrevious: boolean
  }
}

export default function CustomersPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  
  // State management
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  
  // Build query params
  const queryParams = {
    page,
    limit,
    search: search.trim(),
    customerType: typeFilter !== 'all' ? typeFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    sortBy,
    sortOrder
  }
  
  // Fetch customers data
  const { data, error, isLoading } = useSWR<CustomersResponse>(
    ['/customers', queryParams],
    () => apiClient.customers.list(queryParams),
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

  const handleEdit = useCallback((customer: Customer) => {
    setSelectedCustomer(customer)
    setShowEditDialog(true)
  }, [])

  const handleDelete = useCallback((customer: Customer) => {
    setSelectedCustomer(customer)
    setShowDeleteDialog(true)
  }, [])

  const handleView = useCallback((customer: Customer) => {
    router.push(`/dashboard/customers/${customer.id}`)
  }, [router])

  const performDelete = useCallback(async () => {
    if (!selectedCustomer) return

    try {
      await apiClient.customers.delete(selectedCustomer.id)
      toast({
        title: 'Success',
        description: 'Customer deleted successfully',
      })
      mutate(['/customers', queryParams])
      setShowDeleteDialog(false)
      setSelectedCustomer(null)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete customer',
        variant: 'destructive'
      })
    }
  }, [selectedCustomer, queryParams, toast])

  const handleFormSuccess = useCallback(() => {
    mutate(['/customers', queryParams])
    setShowCreateDialog(false)
    setShowEditDialog(false)
    setSelectedCustomer(null)
  }, [queryParams])

  // Table columns
  const columns = [
    {
      key: 'name',
      title: 'Customer Name',
      sortable: true,
      render: (customer: Customer) => (
        <div>
          <div className="font-medium">{customer.name}</div>
          {customer.company && (
            <div className="text-sm text-muted-foreground">{customer.company}</div>
          )}
        </div>
      )
    },
    {
      key: 'customerType',
      title: 'Type',
      sortable: true,
      render: (customer: Customer) => (
        <Badge variant={customer.customerType === 'business' ? 'default' : 'secondary'}>
          {customer.customerType}
        </Badge>
      )
    },
    {
      key: 'email',
      title: 'Contact',
      render: (customer: Customer) => (
        <div className="space-y-1">
          {customer.email && (
            <div className="flex items-center gap-1 text-sm">
              <Mail className="h-3 w-3" />
              {customer.email}
            </div>
          )}
          {customer.phone && (
            <div className="flex items-center gap-1 text-sm">
              <Phone className="h-3 w-3" />
              {customer.phone}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'address',
      title: 'Location',
      render: (customer: Customer) => (
        <div className="text-sm">
          {customer.address?.city || customer.address?.state ? (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {[customer.address?.city, customer.address?.state].filter(Boolean).join(', ')}
            </div>
          ) : (
            <span className="text-muted-foreground">No address</span>
          )}
        </div>
      )
    },
    {
      key: 'totalOrders',
      title: 'Orders',
      sortable: true,
      render: (customer: Customer) => (
        <div className="text-center">
          <div className="font-medium">{customer.totalOrders}</div>
        </div>
      )
    },
    {
      key: 'totalSpent',
      title: 'Total Spent',
      sortable: true,
      render: (customer: Customer) => (
        <div className="font-medium">₹{customer.totalSpent.toFixed(2)}</div>
      )
    },
    {
      key: 'outstandingBalance',
      title: 'Outstanding',
      sortable: true,
      render: (customer: Customer) => (
        <div className={cn(
          'font-medium',
          customer.outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'
        )}>
          ₹{customer.outstandingBalance.toFixed(2)}
        </div>
      )
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      render: (customer: Customer) => (
        <Badge variant={customer.status === 'active' ? 'success' : 'secondary'}>
          {customer.status}
        </Badge>
      )
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (customer: Customer) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handleView(customer)}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            {canWrite && (
              <DropdownMenuItem onClick={() => handleEdit(customer)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Customer
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {canDelete && (
              <DropdownMenuItem 
                className="text-red-600"
                onClick={() => handleDelete(customer)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Customer
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
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">
            Manage your customer relationships and contact information
          </p>
        </div>
        {canWrite && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.pagination.totalCount || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {data?.data.filter(c => c.status === 'active').length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Business Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {data?.data.filter(c => c.customerType === 'business').length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ₹{(data?.data.reduce((sum, c) => sum + c.outstandingBalance, 0) || 0).toFixed(2)}
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
                placeholder="Search customers by name, email, or company..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Customer Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="business">Business</SelectItem>
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
        emptyMessage="No customers found"
      />

      {/* Dialogs */}
      {showCreateDialog && (
        <CustomerFormDialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onSuccess={handleFormSuccess}
        />
      )}

      {showEditDialog && selectedCustomer && (
        <CustomerFormDialog
          open={showEditDialog}
          onClose={() => {
            setShowEditDialog(false)
            setSelectedCustomer(null)
          }}
          onSuccess={handleFormSuccess}
          customer={selectedCustomer}
        />
      )}

      {showDeleteDialog && selectedCustomer && (
        <DeleteConfirmationDialog
          open={showDeleteDialog}
          onClose={() => {
            setShowDeleteDialog(false)
            setSelectedCustomer(null)
          }}
          onConfirm={performDelete}
          title="Delete Customer"
          description={`Are you sure you want to delete "${selectedCustomer.name}"? This action cannot be undone and will remove all associated data.`}
        />
      )}
    </div>
  )
}
