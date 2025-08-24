"use client";

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';
import {
  Eye,
  Pencil,
  Trash2,
  UserPlus,
  MoreHorizontal,
  Shield,
  ShieldCheck,
  Users,
  Mail,
  Phone,
  Key,
  UserX,
  UserCheck
} from 'lucide-react';

import PageContainer from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable, Column } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { UserForm } from '@/components/users/UserForm';
import { apiClient } from '@/lib/api';
import { usePermissions } from '@/context/AuthContext';

export interface User {
   id: string;
   name: string;
   email: string;
   phone?: string;
   role: 'admin' | 'manager' | 'user';
   is_active: boolean;
   email_verified: boolean;
   profile_photo?: string;
   last_login_at?: string;
   created_at: string;
   updated_at?: string;
 }

export interface UserFormData {
   name: string;
   email: string;
   phone: string;
   role: 'admin' | 'manager' | 'user';
   password: string;
   confirmPassword: string;
   profile_photo?: File;
 }

export interface UserFilters {
   role?: 'admin' | 'manager' | 'user';
   status?: 'active' | 'inactive';
   search?: string;
 }

export interface UsersResponse {
   users: User[];
   total: number;
   page: number;
   limit: number;
   total_pages: number;
 }

const ROLES = [
  { value: 'admin', label: 'Administrator', icon: ShieldCheck },
  { value: 'manager', label: 'Manager', icon: Shield },
  { value: 'user', label: 'User', icon: Users },
];

export default function UsersPage() {
  const { canManageUsers } = usePermissions();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<UserFilters>({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch users data using SWR - must be called before any early returns
  const { data, error, isLoading, mutate } = useSWR(
    `users:list:${page}:${limit}:${search}:${JSON.stringify(filters)}`,
    async () => {
      const params: any = {
        page,
        limit,
      };
      if (search) params.search = search;
      if (filters.role) params.role = filters.role;
      if (filters.status !== undefined) params.status = filters.status === 'active';

      return await apiClient.users.list(params);
    },
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
      revalidateIfStale: false,
    }
  );

  // Check permissions
  if (!canManageUsers) {
    return (
      <PageContainer title="Users">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Access Denied</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                You don't have permission to manage users.
              </p>
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  const users = (data as UsersResponse)?.users || [];
  const totalUsers = (data as UsersResponse)?.total || 0;

  const handleCreateUser = async (formData: Partial<UserFormData>) => {
    setIsSubmitting(true);
    try {
      // First create the user
      const userData = await apiClient.users.create({
        name: formData.name!,
        email: formData.email!,
        password: formData.password!,
        phone: formData.phone,
        role: formData.role!,
      });

      // If there's a profile photo, upload it separately
      if (formData.profile_photo && (userData as any).id) {
        await apiClient.users.uploadProfilePhoto((userData as any).id, formData.profile_photo as File);
      }

      toast.success('User created successfully');
      setIsCreateModalOpen(false);
      mutate(); // Refresh data
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to create user';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditUser = async (formData: Partial<UserFormData>) => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      // Update user data first
      await apiClient.users.update(selectedUser.id, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
      });

      // If there's a profile photo, upload it separately
      if (formData.profile_photo) {
        await apiClient.users.uploadProfilePhoto(selectedUser.id, formData.profile_photo as File);
      }

      toast.success('User updated successfully');
      setIsEditModalOpen(false);
      setSelectedUser(null);
      mutate(); // Refresh data
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to update user';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    try {
      await apiClient.users.delete(userId);
      toast.success('User deleted successfully');
      mutate(); // Refresh data
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to delete user';
      toast.error(message);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.length === 0) return;

    try {
      await apiClient.users.bulkDelete(selectedUsers);
      toast.success(`${selectedUsers.length} users deleted successfully`);
      setSelectedUsers([]);
      mutate(); // Refresh data
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to delete users';
      toast.error(message);
    }
  };

  const handleToggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      await apiClient.users.bulkUpdateStatus([userId], isActive);
      toast.success(`User ${isActive ? 'activated' : 'deactivated'} successfully`);
      mutate(); // Refresh data
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to update user status';
      toast.error(message);
    }
  };

  const handleBulkToggleStatus = async (isActive: boolean) => {
    if (selectedUsers.length === 0) return;

    try {
      await apiClient.users.bulkUpdateStatus(selectedUsers, isActive);
      toast.success(`${selectedUsers.length} users ${isActive ? 'activated' : 'deactivated'} successfully`);
      setSelectedUsers([]);
      mutate(); // Refresh data
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to update users status';
      toast.error(message);
    }
  };

  const handleResetPassword = async (userId: string, userName: string) => {
    const newPassword = prompt(`Enter new password for ${userName}:`);
    if (!newPassword) return;

    try {
      await apiClient.users.resetPassword(userId, { new_password: newPassword });
      toast.success('Password reset successfully');
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to reset password';
      toast.error(message);
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'manager': return 'default';
      default: return 'secondary';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'User',
      cell: (user) => (
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.profile_photo} />
            <AvatarFallback className="text-xs">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{user.name}</div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      cell: (user) => (
        <div className="space-y-1">
          <div className="flex items-center text-sm">
            <Mail className="mr-2 h-3 w-3" />
            {user.email_verified ? (
              <span className="text-green-600">Verified</span>
            ) : (
              <span className="text-orange-600">Pending</span>
            )}
          </div>
          {user.phone && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Phone className="mr-2 h-3 w-3" />
              {user.phone}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      cell: (user) => (
        <Badge variant={getRoleBadgeVariant(user.role) as any}>
          {ROLES.find(r => r.value === user.role)?.label}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (user) => (
        <Badge variant={user.is_active ? 'default' : 'secondary'}>
          {user.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      cell: (user) => new Date(user.created_at).toLocaleDateString(),
    },
  ];

  const renderActions = (user: User) => (
    <div className="flex justify-end space-x-1">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/users/${user.id}` as any} aria-label={`View ${user.name}`}>
          <Eye className="w-4 h-4" />
        </Link>
      </Button>
      <Button variant="ghost" size="sm" onClick={() => openEditModal(user)}>
        <Pencil className="w-4 h-4" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => openEditModal(user)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit User
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleResetPassword(user.id, user.name)}>
            <Key className="mr-2 h-4 w-4" />
            Reset Password
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleToggleUserStatus(user.id, !user.is_active)}
          >
            {user.is_active ? (
              <>
                <UserX className="mr-2 h-4 w-4" />
                Deactivate
              </>
            ) : (
              <>
                <UserCheck className="mr-2 h-4 w-4" />
                Activate
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => handleDeleteUser(user.id, user.name)}
            className="text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  const emptyState = (
    <EmptyState
      icon={<Users className="w-12 h-12 text-muted-foreground" />}
      title="No users found"
      description="Get started by adding your first user to the system."
      action={{
        label: "Add User",
        onClick: () => setIsCreateModalOpen(true)
      }}
    />
  );

  const bulkActions = selectedUsers.length > 0 && (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-muted-foreground">
        {selectedUsers.length} selected
      </span>
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleBulkToggleStatus(true)}
      >
        <UserCheck className="mr-2 h-4 w-4" />
        Activate Selected
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleBulkToggleStatus(false)}
      >
        <UserX className="mr-2 h-4 w-4" />
        Deactivate Selected
      </Button>
      <Button
        size="sm"
        variant="destructive"
        onClick={() => {
          if (window.confirm(`Are you sure you want to delete ${selectedUsers.length} users? This action cannot be undone.`)) {
            handleBulkDelete();
          }
        }}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete Selected
      </Button>
    </div>
  );

  return (
    <PageContainer title="User Management" description="Manage your organization's users and their permissions">
      <div className="space-y-6">
        {/* Header with stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => u.is_active).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Admins</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => u.role === 'admin').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Pending Verification</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => !u.email_verified).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users table */}
        <Card className="p-6 bg-background shadow-sm rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">Users</h2>
              <p className="text-sm text-muted-foreground">
                Manage your organization's users and their permissions
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {bulkActions}
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </div>
          </div>

          <DataTable
            data={users}
            columns={columns}
            loading={isLoading}
            error={error ? "Failed to load users" : undefined}
            searchable
            searchPlaceholder="Search users by name, email, or phone"
            onSearch={(query) => setSearch(query)}
            pagination={{
              page,
              limit,
              total: totalUsers,
              onPageChange: setPage,
              onLimitChange: (newLimit) => {
                setLimit(newLimit);
                setPage(1);
              },
            }}
            actions={renderActions}
            emptyState={emptyState}
          />
        </Card>

        {/* Create User Dialog */}
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new user to your organization with appropriate permissions.
              </DialogDescription>
            </DialogHeader>
            <UserForm
              onSubmit={handleCreateUser}
              onCancel={() => setIsCreateModalOpen(false)}
              isLoading={isSubmitting}
            />
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user information and permissions.
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <UserForm
                user={selectedUser}
                onSubmit={handleEditUser}
                onCancel={() => setIsEditModalOpen(false)}
                isLoading={isSubmitting}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PageContainer>
  );
}
