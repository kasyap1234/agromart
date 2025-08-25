"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserForm } from '@/components/users/UserForm';
import { apiClient } from '@/lib/api';
import { usePermissions } from '@/context/AuthContext';
import { UserFormData } from '@/app/users/page';
import { ArrowLeft, UserPlus, Shield } from 'lucide-react';

export default function NewUserPage() {
  const router = useRouter();
  const { canManageUsers } = usePermissions();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check permissions
  if (!canManageUsers) {
    return (
      <DashboardLayout title="Create User">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Access Denied</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                You don't have permission to create users.
              </p>
              <Button 
                onClick={() => router.push('/users')} 
                className="mt-4"
                variant="outline"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Users
              </Button>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const handleCancel = () => {
    router.push('/users');
  };

  const handleCreateUser = async (formData: Partial<UserFormData>) => {
    setIsSubmitting(true);
    try {
      // Create the user
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
      router.push('/users');
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to create user';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout title="Create New User">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleCancel}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Users
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create New User</h1>
              <p className="text-gray-600">
                Add a new user to your organization with appropriate permissions
              </p>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              User Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UserForm
              onSubmit={handleCreateUser}
              onCancel={handleCancel}
              isLoading={isSubmitting}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}