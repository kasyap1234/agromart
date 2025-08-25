"use client";

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { apiClient } from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Loader2, 
  ArrowLeft, 
  Edit, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Shield, 
  Eye,
  EyeOff,
  Key,
  UserCheck,
  UserX,
  Camera,
  Download
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format, parseISO } from 'date-fns';

// Types following TypeScript best practices
interface User {
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
  created_by?: string;
}

// Constants moved outside component for performance
const ROLE_CONFIG = {
  admin: { label: 'Administrator', color: 'destructive' as const, icon: Shield },
  manager: { label: 'Manager', color: 'default' as const, icon: Shield },
  user: { label: 'User', color: 'secondary' as const, icon: User },
} as const;

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  // Data fetching with SWR following Next.js best practices
  const { data: user, isLoading, error, mutate } = useSWR(
    userId ? `user:${userId}` : null,
    () => apiClient.users.get(userId),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  // Event handlers following React best practices
  const handleEdit = useCallback(() => {
    router.push(`/users/${userId}/edit`);
  }, [router, userId]);

  const handleGoBack = useCallback(() => {
    router.push('/users');
  }, [router]);

  const handleToggleStatus = useCallback(async () => {
    if (!user?.data) return;
    
    setUpdatingStatus(true);
    try {
      await apiClient.users.bulkUpdateStatus([userId], !user.data.is_active);
      toast.success(`User ${!user.data.is_active ? 'activated' : 'deactivated'} successfully`);
      mutate(); // Refresh data
    } catch (error: any) {
      console.error('Error updating user status:', error);
      const message = error?.response?.data?.message || error?.message || 'Failed to update user status';
      toast.error(message);
    } finally {
      setUpdatingStatus(false);
    }
  }, [user?.data, userId, mutate]);

  const handleResetPassword = useCallback(async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    setResettingPassword(true);
    try {
      await apiClient.users.resetPassword(userId, { new_password: newPassword });
      toast.success('Password reset successfully');
      setShowPasswordDialog(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error resetting password:', error);
      const message = error?.response?.data?.message || error?.message || 'Failed to reset password';
      toast.error(message);
    } finally {
      setResettingPassword(false);
    }
  }, [userId, newPassword, confirmPassword]);

  const handleExport = useCallback(() => {
    if (!user?.data) return;
    
    // Create user export data
    const exportData = {
      id: user.data.id,
      name: user.data.name,
      email: user.data.email,
      phone: user.data.phone || 'N/A',
      role: user.data.role,
      status: user.data.is_active ? 'Active' : 'Inactive',
      email_verified: user.data.email_verified ? 'Yes' : 'No',
      last_login: user.data.last_login_at ? format(parseISO(user.data.last_login_at), 'PPp') : 'Never',
      created_at: format(parseISO(user.data.created_at), 'PPp'),
      updated_at: user.data.updated_at ? format(parseISO(user.data.updated_at), 'PPp') : 'Never',
    };

    // Convert to CSV
    const headers = Object.keys(exportData);
    const values = Object.values(exportData);
    const csvContent = [
      headers.join(','),
      values.join(','),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-${user.data.name.replace(/\s+/g, '-').toLowerCase()}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('User data exported successfully');
  }, [user?.data]);

  if (isLoading) {
    return (
      <DashboardLayout title="User Details">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !user?.data) {
    return (
      <DashboardLayout title="User Details">
        <div className="text-center py-8">
          <p className="text-red-600">Failed to load user details</p>
          <Button 
            onClick={() => router.push('/users')} 
            variant="outline" 
            className="mt-4"
          >
            Back to Users
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const userData = user.data;
  const roleConfig = ROLE_CONFIG[userData.role];

  return (
    <DashboardLayout title={userData.name}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleGoBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Users
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <User className="h-6 w-6" />
                {userData.name}
              </h1>
              <p className="text-gray-600">
                View and manage user details
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Key className="h-4 w-4 mr-2" />
                  Reset Password
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reset Password</DialogTitle>
                  <DialogDescription>
                    Enter a new password for {userData.name}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                      placeholder="Enter new password"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowPasswordDialog(false)}
                    disabled={resettingPassword}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleResetPassword}
                    disabled={resettingPassword || !newPassword || !confirmPassword}
                  >
                    {resettingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Reset Password
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button 
              onClick={handleToggleStatus}
              variant={userData.is_active ? "outline" : "default"}
              size="sm"
              disabled={updatingStatus}
            >
              {updatingStatus ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : userData.is_active ? (
                <UserX className="h-4 w-4 mr-2" />
              ) : (
                <UserCheck className="h-4 w-4 mr-2" />
              )}
              {userData.is_active ? 'Deactivate' : 'Activate'}
            </Button>
            <Button onClick={handleEdit} size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit User
            </Button>
          </div>
        </div>

        {/* User Information */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={userData.profile_photo} />
                  <AvatarFallback className="text-lg">
                    {userData.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{userData.name}</h3>
                  <p className="text-gray-600">{userData.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={roleConfig.color}>
                      {roleConfig.label}
                    </Badge>
                    <Badge variant={userData.is_active ? 'default' : 'destructive'}>
                      {userData.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {userData.phone && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <p className="text-lg flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {userData.phone}
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-500">Email Verification</label>
                <p className="text-lg flex items-center gap-1">
                  {userData.email_verified ? (
                    <>
                      <Eye className="h-4 w-4 text-green-500" />
                      <span className="text-green-600">Verified</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-4 w-4 text-orange-500" />
                      <span className="text-orange-600">Pending</span>
                    </>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Role & Permissions</label>
                <div className="flex items-center gap-2 mt-1">
                  <roleConfig.icon className="h-4 w-4" />
                  <span className="text-lg">{roleConfig.label}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {userData.role === 'admin' && 'Full system access and user management'}
                  {userData.role === 'manager' && 'Inventory and business operations management'}
                  {userData.role === 'user' && 'Limited access to assigned functions'}
                </p>
              </div>
              
              <Separator />
              
              <div>
                <label className="text-sm font-medium text-gray-500">Last Login</label>
                <p className="text-lg">
                  {userData.last_login_at 
                    ? format(parseISO(userData.last_login_at), 'PPp')
                    : 'Never'
                  }
                </p>
              </div>
              
              <Separator />
              
              <div>
                <label className="text-sm font-medium text-gray-500">Account Created</label>
                <p className="text-lg">
                  {format(parseISO(userData.created_at), 'PPp')}
                </p>
              </div>
              
              {userData.updated_at && (
                <>
                  <Separator />
                  <div>
                    <label className="text-sm font-medium text-gray-500">Last Updated</label>
                    <p className="text-lg">
                      {format(parseISO(userData.updated_at), 'PPp')}
                    </p>
                  </div>
                </>
              )}

              {userData.created_by && (
                <>
                  <Separator />
                  <div>
                    <label className="text-sm font-medium text-gray-500">Created By</label>
                    <p className="text-lg">{userData.created_by}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Account Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Account Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => router.push(`/users/${userId}/edit`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowPasswordDialog(true)}
              >
                <Key className="h-4 w-4 mr-2" />
                Reset Password
              </Button>
              <Button 
                variant="outline" 
                onClick={handleToggleStatus}
                disabled={updatingStatus}
              >
                {userData.is_active ? (
                  <>
                    <UserX className="h-4 w-4 mr-2" />
                    Deactivate Account
                  </>
                ) : (
                  <>
                    <UserCheck className="h-4 w-4 mr-2" />
                    Activate Account
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}