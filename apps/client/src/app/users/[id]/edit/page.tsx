"use client";

import { useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, ArrowLeft, Save, X, Upload, Camera, User } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Validation schema following Zod best practices
const userSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  role: z.enum(['admin', 'manager', 'user'], {
    required_error: 'Role is required',
  }),
  is_active: z.boolean().default(true),
});

type UserFormData = z.infer<typeof userSchema>;

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
  created_at: string;
  updated_at?: string;
}

// Constants moved outside component for performance
const ROLES = [
  { value: 'admin', label: 'Administrator', description: 'Full system access and user management' },
  { value: 'manager', label: 'Manager', description: 'Inventory and business operations management' },
  { value: 'user', label: 'User', description: 'Limited access to assigned functions' },
] as const;

export default function EditUserPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  // Form setup with React Hook Form following React 19 patterns
  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      role: 'user',
      is_active: true,
    },
  });

  // Data fetching with SWR
  const { data: user, isLoading, error } = useSWR(
    userId ? `user:${userId}` : null,
    () => apiClient.users.get(userId),
    { revalidateOnFocus: false }
  );

  // Set form values when user data is loaded
  useState(() => {
    if (user?.data) {
      const userData = user.data;
      form.reset({
        name: userData.name,
        email: userData.email,
        phone: userData.phone || '',
        role: userData.role,
        is_active: userData.is_active,
      });
      if (userData.profile_photo) {
        setPreviewUrl(userData.profile_photo);
      }
    }
  });

  // Event handlers following React best practices
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      
      setProfilePhoto(file);
      
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  }, []);

  const handlePhotoUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleRemovePhoto = useCallback(async () => {
    if (!user?.data?.profile_photo) return;
    
    try {
      setUploadingPhoto(true);
      await apiClient.users.deleteProfilePhoto(userId);
      setPreviewUrl('');
      setProfilePhoto(null);
      toast.success('Profile photo removed successfully');
    } catch (error: any) {
      console.error('Error removing profile photo:', error);
      const message = error?.response?.data?.message || error?.message || 'Failed to remove profile photo';
      toast.error(message);
    } finally {
      setUploadingPhoto(false);
    }
  }, [user?.data?.profile_photo, userId]);

  const onSubmit = async (data: UserFormData) => {
    setSubmitting(true);
    try {
      // Update user data
      await apiClient.users.update(userId, {
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        role: data.role,
        is_active: data.is_active,
      });

      // Upload profile photo if selected
      if (profilePhoto) {
        await apiClient.users.uploadProfilePhoto(userId, profilePhoto);
      }

      toast.success('User updated successfully');
      router.push(`/users/${userId}`);
    } catch (error: any) {
      console.error('Error updating user:', error);
      const message = error?.response?.data?.message || error?.message || 'Failed to update user';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = useCallback(() => {
    router.push(`/users/${userId}`);
  }, [router, userId]);

  if (isLoading) {
    return (
      <DashboardLayout title="Edit User">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !user?.data) {
    return (
      <DashboardLayout title="Edit User">
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

  return (
    <DashboardLayout title="Edit User">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push(`/users/${userId}`)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to User Details
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Edit User: {userData.name}
              </h1>
              <p className="text-gray-600">
                Update user information and permissions
              </p>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Profile Photo Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Profile Photo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={previewUrl} />
                    <AvatarFallback className="text-2xl">
                      {userData.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      Upload a new profile photo. Recommended size: 400x400px
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handlePhotoUpload}
                        disabled={uploadingPhoto}
                      >
                        {uploadingPhoto ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Upload className="h-4 w-4 mr-2" />
                        )}
                        Upload Photo
                      </Button>
                      {previewUrl && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleRemovePhoto}
                          disabled={uploadingPhoto}
                        >
                          Remove Photo
                        </Button>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* User Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  User Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter full name" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Email */}
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address *</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="Enter email address" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Phone */}
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input 
                            type="tel" 
                            placeholder="Enter phone number (optional)" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Role */}
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ROLES.map((role) => (
                              <SelectItem key={role.value} value={role.value}>
                                <div>
                                  <div className="font-medium">{role.label}</div>
                                  <div className="text-sm text-gray-500">{role.description}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Account Status */}
            <Card>
              <CardHeader>
                <CardTitle>Account Status</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <div>
                          <FormLabel className="text-base font-medium">
                            Active Account
                          </FormLabel>
                          <p className="text-sm text-gray-500">
                            When unchecked, the user will not be able to log in to the system
                          </p>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCancel}
                disabled={submitting}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={submitting}
                className="flex items-center gap-2"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {submitting ? 'Updating...' : 'Update User'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}