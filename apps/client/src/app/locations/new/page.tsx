"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, ArrowLeft, Save, X, MapPin, Building2, Home, Package } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Validation schema following React Hook Form + Zod best practices
const locationSchema = z.object({
  name: z.string().min(1, 'Location name is required').max(100, 'Name must be less than 100 characters'),
  location_type: z.string().min(1, 'Location type is required'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  capacity: z.string().optional(),
  capacity_unit: z.string().optional(),
  operating_hours: z.string().optional(),
  temperature_controlled: z.boolean().default(false),
  security_level: z.string().optional(),
  is_active: z.boolean().default(true),
  notes: z.string().optional(),
});

type LocationFormData = z.infer<typeof locationSchema>;

// Constants following React best practices - moved outside component to prevent re-creation
const LOCATION_TYPES = [
  { value: 'warehouse', label: 'Warehouse', icon: Package },
  { value: 'store', label: 'Store', icon: Building2 },
  { value: 'office', label: 'Office', icon: Building2 },
  { value: 'farm', label: 'Farm', icon: Home },
  { value: 'distribution', label: 'Distribution Center', icon: Package },
  { value: 'other', label: 'Other', icon: MapPin },
] as const;

const SECURITY_LEVELS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'maximum', label: 'Maximum' },
] as const;

const CAPACITY_UNITS = [
  { value: 'sqft', label: 'Square Feet' },
  { value: 'sqm', label: 'Square Meters' },
  { value: 'pallets', label: 'Pallets' },
  { value: 'containers', label: 'Containers' },
  { value: 'tons', label: 'Tons' },
  { value: 'kg', label: 'Kilograms' },
  { value: 'other', label: 'Other' },
] as const;

export default function NewLocationPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  // React Hook Form following Next.js 15.5 best practices
  const form = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: '',
      location_type: '',
      address: '',
      city: '',
      state: '',
      postal_code: '',
      country: '',
      phone: '',
      email: '',
      capacity: '',
      capacity_unit: '',
      operating_hours: '',
      temperature_controlled: false,
      security_level: '',
      is_active: true,
      notes: '',
    },
  });

  // Form submission handler following React best practices
  const onSubmit = async (data: LocationFormData) => {
    setSubmitting(true);
    try {
      const response = await apiClient.locations.create(data);
      toast.success('Location created successfully');
      
      // Navigate to detail page if ID is returned, otherwise to list
      if (response?.data?.id) {
        router.push(`/locations/${response.data.id}`);
      } else {
        router.push('/locations');
      }
    } catch (error: any) {
      console.error('Error creating location:', error);
      const message = error?.response?.data?.message || error?.message || 'Failed to create location';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  // Navigation handler following Next.js best practices
  const handleCancel = () => {
    router.push('/locations');
  };

  return (
    <DashboardLayout title="New Location">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleCancel}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Locations
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create New Location</h1>
              <p className="text-gray-600">
                Add a new location for inventory management
              </p>
            </div>
          </div>
        </div>

        {/* Form Section */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Location Name */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location Name *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter location name" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Location Type */}
                  <FormField
                    control={form.control}
                    name="location_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location Type *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select location type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {LOCATION_TYPES.map((type) => {
                              const IconComponent = type.icon;
                              return (
                                <SelectItem key={type.value} value={type.value}>
                                  <div className="flex items-center gap-2">
                                    <IconComponent className="h-4 w-4" />
                                    {type.label}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Capacity */}
                  <FormField
                    control={form.control}
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Capacity</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter capacity" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Capacity Unit */}
                  <FormField
                    control={form.control}
                    name="capacity_unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Capacity Unit</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CAPACITY_UNITS.map((unit) => (
                              <SelectItem key={unit.value} value={unit.value}>
                                {unit.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Operating Hours - Full Width */}
                  <div className="md:col-span-2">
                    <FormField
                      control={form.control}
                      name="operating_hours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Operating Hours</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., Mon-Fri 9:00 AM - 5:00 PM" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Address Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Address Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Street Address */}
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter street address" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* City, State, Postal Code Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter city" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State/Province</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter state/province" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="postal_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal Code</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter postal code" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Country */}
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter country" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Contact & Features Card */}
            <Card>
              <CardHeader>
                <CardTitle>Contact & Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Phone */}
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter phone number" 
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
                        <FormLabel>Email Address</FormLabel>
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

                  {/* Security Level */}
                  <FormField
                    control={form.control}
                    name="security_level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Security Level</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select security level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SECURITY_LEVELS.map((level) => (
                              <SelectItem key={level.value} value={level.value}>
                                {level.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Feature Toggles */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="temperature_controlled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Temperature Controlled
                          </FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Enable if this location has climate control
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Active Status
                          </FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Enable if this location is currently operational
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Notes */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Additional notes about this location..." 
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Action Buttons */}
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
                {submitting ? 'Creating...' : 'Create Location'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}