'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import { apiClient } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info, Shield } from 'lucide-react'

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

const userSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  role: z.enum(['admin', 'manager', 'user']),
  status: z.enum(['active', 'inactive']),
})

type UserFormData = z.infer<typeof userSchema>

interface UserFormDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  user?: User
}

const ROLE_PERMISSIONS = {
  admin: [
    'Full system access',
    'User management',
    'System configuration',
    'All data access',
    'Reports and analytics'
  ],
  manager: [
    'Inventory management',
    'Order management',
    'Customer management',
    'Reports viewing',
    'Product management'
  ],
  user: [
    'Basic inventory access',
    'Order viewing',
    'Limited data entry',
    'Basic reports'
  ]
}

export default function UserFormDialog({
  open,
  onClose,
  onSuccess,
  user
}: UserFormDialogProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isEditing = !!user

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'user',
      status: 'active',
    },
  })

  // Watch role to show permissions
  const selectedRole = form.watch('role')

  // Reset form when user changes or dialog opens
  useEffect(() => {
    if (open) {
      if (user) {
        form.reset({
          name: user.name,
          email: user.email,
          password: '', // Don't pre-fill password for editing
          role: user.role,
          status: user.status,
        })
      } else {
        form.reset({
          name: '',
          email: '',
          password: '',
          role: 'user',
          status: 'active',
        })
      }
    }
  }, [user, open, form])

  const onSubmit = async (data: UserFormData) => {
    try {
      setIsSubmitting(true)
      
      // Clean up data - remove empty password for editing
      const submitData = {
        ...data,
        password: isEditing && !data.password ? undefined : data.password,
      }

      if (isEditing) {
        await apiClient.users.update(user.id, submitData)
        toast({
          title: 'Success',
          description: 'User updated successfully',
        })
      } else {
        await apiClient.users.create(submitData)
        toast({
          title: 'Success',
          description: 'User created successfully. They will receive an email with login instructions.',
        })
      }
      
      onSuccess()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${isEditing ? 'update' : 'create'} user`,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit User' : 'Add New User'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the user information and permissions below.' 
              : 'Create a new user account and assign appropriate role and permissions.'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
              </div>

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Password {isEditing ? '' : '*'}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder={isEditing ? 'Leave blank to keep current password' : 'Enter password'}
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      {isEditing 
                        ? 'Only fill this if you want to change the user\'s password'
                        : 'Minimum 6 characters required'
                      }
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Role and Status */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="admin">Administrator</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="flex flex-col justify-end">
                      <FormLabel>Account Status</FormLabel>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={field.value === 'active'}
                          onCheckedChange={(checked) => 
                            field.onChange(checked ? 'active' : 'inactive')
                          }
                        />
                        <span className="text-sm">
                          {field.value === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Role Permissions Preview */}
              {selectedRole && (
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="font-medium">
                        Permissions for {selectedRole} role:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {ROLE_PERMISSIONS[selectedRole].map((permission, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {permission}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Admin Warning */}
              {selectedRole === 'admin' && (
                <Alert className="border-orange-200 bg-orange-50">
                  <Info className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    <strong>Warning:</strong> Admin users have full system access including user management. 
                    Only assign this role to trusted individuals.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : isEditing ? 'Update User' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
