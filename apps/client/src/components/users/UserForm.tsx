"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PasswordStrengthMeter } from '@/components/ui/password-strength';
import { AvatarUpload } from '@/components/ui/avatar-upload';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, UserFormData } from '@/app/users/page';
import {
  UserPlus,
  Shield,
  ShieldCheck,
  Users,
  Upload,
  X
} from 'lucide-react';

const userFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional(),
  role: z.enum(['admin', 'manager', 'user']),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const userUpdateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional(),
  role: z.enum(['admin', 'manager', 'user']),
});

interface UserFormProps {
  user?: User;
  onSubmit: (data: Partial<UserFormData>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const ROLES = [
  { value: 'admin', label: 'Administrator', icon: ShieldCheck, color: 'destructive' },
  { value: 'manager', label: 'Manager', icon: Shield, color: 'default' },
  { value: 'user', label: 'User', icon: Users, color: 'secondary' },
];

export function UserForm({ user, onSubmit, onCancel, isLoading = false }: UserFormProps) {
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(user?.profile_photo || null);

  const isEditing = !!user;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(isEditing ? userUpdateSchema : userFormSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      role: user?.role || 'user',
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');

  const handleFileSelect = (file: File | null) => {
    setProfilePhoto(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPhotoPreview(user?.profile_photo || null);
    }
  };

  const handleFormSubmit = async (data: UserFormData) => {
    const submitData: Partial<UserFormData> = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: data.role,
    };

    if (!isEditing) {
      submitData.password = data.password;
    }

    if (profilePhoto) {
      submitData.profile_photo = profilePhoto;
    }

    await onSubmit(submitData);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Profile Photo Section */}
      <div className="flex items-center space-x-4">
        <div className="relative">
          <Avatar className="h-20 w-20">
            <AvatarImage src={photoPreview || undefined} />
            <AvatarFallback className="text-lg">
              {watch('name') ? getInitials(watch('name')) : <UserPlus className="h-8 w-8" />}
            </AvatarFallback>
          </Avatar>
          {(photoPreview || user?.profile_photo) && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
              onClick={() => handleFileSelect(null)}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <div className="flex-1">
          <Label htmlFor="profile-photo">Profile Photo</Label>
          <AvatarUpload
            accept="image/*"
            maxSize={5}
            onChange={handleFileSelect}
            value={photoPreview}
            className="mt-2"
          />
        </div>
      </div>

      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name *</Label>
          <Input
            id="name"
            {...register('name')}
            placeholder="Enter full name"
            className={errors.name ? 'border-destructive' : ''}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email Address *</Label>
          <Input
            id="email"
            type="email"
            {...register('email')}
            placeholder="Enter email address"
            className={errors.email ? 'border-destructive' : ''}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            {...register('phone')}
            placeholder="Enter phone number"
            className={errors.phone ? 'border-destructive' : ''}
          />
          {errors.phone && (
            <p className="text-sm text-destructive">{errors.phone.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Role *</Label>
          <Select
            value={watch('role')}
            onValueChange={(value) => setValue('role', value as UserFormData['role'])}
          >
            <SelectTrigger className={errors.role ? 'border-destructive' : ''}>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  <div className="flex items-center">
                    <role.icon className="mr-2 h-4 w-4" />
                    {role.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.role && (
            <p className="text-sm text-destructive">{errors.role.message}</p>
          )}
        </div>
      </div>

      {/* Password Section - Only for new users */}
      {!isEditing && (
        <>
          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              {...register('password')}
              placeholder="Enter password"
              className={errors.password ? 'border-destructive' : ''}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password *</Label>
            <Input
              id="confirmPassword"
              type="password"
              {...register('confirmPassword')}
              placeholder="Confirm password"
              className={errors.confirmPassword ? 'border-destructive' : ''}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Password Strength Meter */}
          {password && <PasswordStrengthMeter password={password} />}
        </>
      )}

      {/* Role Permissions Preview */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="font-medium mb-2">Role Permissions</h4>
        <div className="flex items-center space-x-2">
          <Badge variant={ROLES.find(r => r.value === watch('role'))?.color as any}>
            {ROLES.find(r => r.value === watch('role'))?.label}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {watch('role') === 'admin' && 'Full system access and user management'}
            {watch('role') === 'manager' && 'Can manage products, orders, and view reports'}
            {watch('role') === 'user' && 'Basic access to assigned features'}
          </span>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : isEditing ? 'Update User' : 'Create User'}
        </Button>
      </div>
    </form>
  );
}