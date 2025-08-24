'use client'

import * as React from 'react'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, MoreHorizontal, Edit, Eye, Trash2, Users, UserCheck, UserX, Shield } from 'lucide-react'
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
import { Alert, AlertDescription } from '@/components/ui/alert'

import UserFormDialog from './UserFormDialog'

interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'manager' | 'user'
  status: 'active' | 'inactive'
  lastLogin?: string
  createdAt: string
  updatedAt: string
  permissions?: string[]
}

interface UsersResponse {
  data: User[]
  pagination: {
    currentPage: number
    totalPages: number
    totalCount: number
    limit: number
    hasNext: boolean
    hasPrevious: boolean
  }
}

const ROLE_COLORS = {
  admin: 'destructive',
  manager: 'default',
  user: 'secondary'
} as const

const ROLE_DESCRIPTIONS = {
  admin: 'Full system access and user management',
  manager: 'Inventory and business operations management', 
  user: 'Limited access to assigned functions'
}

export default function UsersPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  
  // State management
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  // Check if current user is admin
  const isAdmin = user?.role === 'admin'

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <Alert className="border-red-200 bg-red-50">
          <Shield className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            You don't have permission to access user management. Only administrators can manage users.
          </AlertDescription>
        </Alert>
      </div>
    )
  }
  
  // Build query params
  const queryParams = {
    page,
    limit,
    search: search.trim(),
    role: roleFilter !== 'all' ? roleFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    sortBy,
    sortOrder
  }
  
  // Fetch users data
  const { data, error, isLoading } = useSWR<UsersResponse>(
    ['/users', queryParams],
    () => apiClient.users.list(queryParams),
    {
      keepPreviousData: true,
      revalidateOnFocus: false
    }
  )

  // Handlers
  const handleSearch = useCallback((value: string) => {
    setSearch(value)
    setPage(1)
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

  const handleEdit = useCallback((selectedUser: User) => {
    setSelectedUser(selectedUser)
    setShowEditDialog(true)
  }, [])

  const handleDelete = useCallback((selectedUser: User) => {
    if (selectedUser.id === user?.id) {
      toast({
        title: 'Action Not Allowed',
        description: 'You cannot delete your own account.',
        variant: 'destructive'
      })
      return
    }
    setSelectedUser(selectedUser)
    setShowDeleteDialog(true)
  }, [user?.id, toast])

  const handleView = useCallback((selectedUser: User) => {
    router.push(`/dashboard/users/${selectedUser.id}`)
  }, [router])

  const performDelete = useCallback(async () => {
    if (!selectedUser) return

    try {
      await apiClient.users.delete(selectedUser.id)
      toast({
        title: 'Success',
        description: 'User deleted successfully',
      })
      mutate(['/users', queryParams])
      setShowDeleteDialog(false)
      setSelectedUser(null)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete user',
        variant: 'destructive'
      })
    }
  }, [selectedUser, queryParams, toast])

  const handleFormSuccess = useCallback(() => {
    mutate(['/users', queryParams])
    setShowCreateDialog(false)
    setShowEditDialog(false)
    setSelectedUser(null)
  }, [queryParams])

  const handleToggleStatus = useCallback(async (userId: string, currentStatus: string) => {
    if (userId === user?.id) {
      toast({
        title: 'Action Not Allowed',
        description: 'You cannot change your own account status.',
        variant: 'destructive'
      })
      return
    }

    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
      await apiClient.users.updateStatus(userId, newStatus)
      toast({
        title: 'Success',
        description: `User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
      })
      mutate(['/users', queryParams])
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user status',
        variant: 'destructive'
      })
    }
  }, [user?.id, queryParams, toast])

  // Table columns
  const columns = [
    {
      key: 'name',
      title: 'User',
      sortable: true,
      render: (userData: User) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-primary">{userData.name[0]?.toUpperCase()}</span>
          </div>
          <div>
            <div className="font-medium">{userData.name}</div>
            <div className="text-sm text-muted-foreground">{userData.email}</div>
          </div>
        </div>
      )
    },
    {
      key: 'role',
      title: 'Role',
      sortable: true,
      render: (userData: User) => (
        <div className="space-y-1">
          <Badge variant={ROLE_COLORS[userData.role]}>
            {userData.role}
          </Badge>
          <div className="text-xs text-muted-foreground">
            {ROLE_DESCRIPTIONS[userData.role]}
          </div>
        </div>
      )
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      render: (userData: User) => (
        <div className="flex items-center gap-2">
          <Badge variant={userData.status === 'active' ? 'success' : 'secondary'}>
            {userData.status === 'active' ? (
              <>
                <UserCheck className="h-3 w-3 mr-1" />
                Active
              </>
            ) : (
              <>
                <UserX className="h-3 w-3 mr-1" />
                Inactive
              </>
            )}
          </Badge>
        </div>
      )
    },
    {
      key: 'lastLogin',
      title: 'Last Login',
      render: (userData: User) => (
        <div className="text-sm">
          {userData.lastLogin ? (
            new Date(userData.lastLogin).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          ) : (
            <span className="text-muted-foreground">Never</span>
          )}
        </div>
      )
    },
    {
      key: 'createdAt',
      title: 'Created',
      sortable: true,
      render: (userData: User) => (
        <div className="text-sm">
          {new Date(userData.createdAt).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
        </div>
      )
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (userData: User) => {
        const isCurrentUser = userData.id === user?.id
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleView(userData)}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEdit(userData)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit User
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {!isCurrentUser && (
                <DropdownMenuItem 
                  onClick={() => handleToggleStatus(userData.id, userData.status)}
                >
                  {userData.status === 'active' ? (
                    <>
                      <UserX className="h-4 w-4 mr-2" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4 mr-2" />
                      Activate
                    </>
                  )}
                </DropdownMenuItem>
              )}
              {!isCurrentUser && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-red-600"
                    onClick={() => handleDelete(userData)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete User
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      }
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage user accounts, roles, and permissions
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.pagination.totalCount || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {data?.data.filter(u => u.status === 'active').length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administrators</CardTitle>
            <Shield className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {data?.data.filter(u => u.role === 'admin').length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Managers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {data?.data.filter(u => u.role === 'manager').length || 0}
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
                placeholder="Search users by name or email..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Role Filter */}
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full md:w-36">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="user">User</SelectItem>
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
        emptyMessage="No users found"
      />

      {/* Dialogs */}
      {showCreateDialog && (
        <UserFormDialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onSuccess={handleFormSuccess}
        />
      )}

      {showEditDialog && selectedUser && (
        <UserFormDialog
          open={showEditDialog}
          onClose={() => {
            setShowEditDialog(false)
            setSelectedUser(null)
          }}
          onSuccess={handleFormSuccess}
          user={selectedUser}
        />
      )}

      {showDeleteDialog && selectedUser && (
        <DeleteConfirmationDialog
          open={showDeleteDialog}
          onClose={() => {
            setShowDeleteDialog(false)
            setSelectedUser(null)
          }}
          onConfirm={performDelete}
          title="Delete User"
          description={`Are you sure you want to delete "${selectedUser.name}"? This action cannot be undone and will permanently remove the user account.`}
        />
      )}
    </div>
  )
}
