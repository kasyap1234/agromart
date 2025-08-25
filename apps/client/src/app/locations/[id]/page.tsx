"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { apiClient } from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, ArrowLeft, Edit, MapPin, Building2, Home, Package, Phone, Mail, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format, parseISO } from 'date-fns';

interface Location {
  id: string;
  tenant_id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  email?: string;
  location_type: string;
  capacity?: string;
  capacity_unit?: string;
  manager_id?: string;
  operating_hours?: string;
  temperature_controlled: boolean;
  security_level?: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

const LOCATION_TYPE_ICONS: Record<string, any> = {
  warehouse: Package,
  store: Building2,
  office: Building2,
  farm: Home,
  distribution: Package,
  other: MapPin,
};

const LOCATION_TYPE_LABELS: Record<string, string> = {
  warehouse: 'Warehouse',
  store: 'Store',
  office: 'Office',
  farm: 'Farm',
  distribution: 'Distribution Center',
  other: 'Other',
};

export default function LocationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const locationId = params.id as string;

  const { data: location, isLoading, error, mutate } = useSWR(
    locationId ? `location:${locationId}` : null,
    () => apiClient.locations.get(locationId)
  );

  const handleEdit = () => {
    router.push(`/locations/${locationId}/edit`);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this location? This action cannot be undone.')) {
      return;
    }

    try {
      await apiClient.locations.delete(locationId);
      toast.success('Location deleted successfully');
      router.push('/locations');
    } catch (error: any) {
      console.error('Error deleting location:', error);
      const message = error?.response?.data?.message || error?.message || 'Failed to delete location';
      toast.error(message);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Location Details">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !location) {
    return (
      <DashboardLayout title="Location Details">
        <div className="text-center py-8">
          <p className="text-red-600">Failed to load location details</p>
          <Button 
            onClick={() => router.push('/locations')} 
            variant="outline" 
            className="mt-4"
          >
            Back to Locations
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const locationData = location?.data || location;
  const LocationIcon = LOCATION_TYPE_ICONS[locationData.location_type] || MapPin;

  return (
    <DashboardLayout title={locationData.name}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push('/locations')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Locations
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <LocationIcon className="h-6 w-6" />
                {locationData.name}
              </h1>
              <p className="text-gray-600">
                {LOCATION_TYPE_LABELS[locationData.location_type] || 'Location'} details and information
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleEdit} className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Edit Location
            </Button>
            <Button 
              onClick={handleDelete} 
              variant="destructive" 
              className="flex items-center gap-2"
            >
              Delete
            </Button>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <Badge variant={locationData.is_active ? "default" : "secondary"}>
            {locationData.is_active ? "Active" : "Inactive"}
          </Badge>
          <Badge variant="outline">
            {LOCATION_TYPE_LABELS[locationData.location_type] || locationData.location_type}
          </Badge>
        </div>

        {/* Location Information */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Location Name</label>
                <p className="text-lg font-semibold">{locationData.name}</p>
              </div>
              
              <Separator />
              
              <div>
                <label className="text-sm font-medium text-gray-500">Type</label>
                <p className="text-lg flex items-center gap-2">
                  <LocationIcon className="h-4 w-4" />
                  {LOCATION_TYPE_LABELS[locationData.location_type] || locationData.location_type}
                </p>
              </div>
              
              {locationData.capacity && (
                <>
                  <Separator />
                  <div>
                    <label className="text-sm font-medium text-gray-500">Capacity</label>
                    <p className="text-lg">
                      {locationData.capacity} {locationData.capacity_unit || 'units'}
                    </p>
                  </div>
                </>
              )}

              {locationData.operating_hours && (
                <>
                  <Separator />
                  <div>
                    <label className="text-sm font-medium text-gray-500">Operating Hours</label>
                    <p className="text-lg">{locationData.operating_hours}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Contact & Address Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Contact & Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {locationData.address && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Address</label>
                  <p className="text-lg">{locationData.address}</p>
                  {(locationData.city || locationData.state || locationData.postal_code) && (
                    <p className="text-sm text-gray-600">
                      {[locationData.city, locationData.state, locationData.postal_code].filter(Boolean).join(', ')}
                    </p>
                  )}
                  {locationData.country && (
                    <p className="text-sm text-gray-600">{locationData.country}</p>
                  )}
                </div>
              )}
              
              {(locationData.phone || locationData.email) && <Separator />}
              
              {locationData.phone && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <p className="text-lg flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {locationData.phone}
                  </p>
                </div>
              )}

              {locationData.email && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-lg flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {locationData.email}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Additional Features */}
        <Card>
          <CardHeader>
            <CardTitle>Features & Specifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Temperature Controlled</label>
                <p className="text-lg">
                  <Badge variant={locationData.temperature_controlled ? "default" : "secondary"}>
                    {locationData.temperature_controlled ? "Yes" : "No"}
                  </Badge>
                </p>
              </div>
              
              {locationData.security_level && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Security Level</label>
                  <p className="text-lg">
                    <Badge variant="outline">{locationData.security_level}</Badge>
                  </p>
                </div>
              )}
            </div>

            {locationData.notes && (
              <>
                <Separator />
                <div>
                  <label className="text-sm font-medium text-gray-500">Notes</label>
                  <p className="text-sm bg-gray-50 p-3 rounded-md mt-1">
                    {locationData.notes}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Audit Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Audit Trail
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Created At</label>
                <p className="text-sm">
                  {format(parseISO(locationData.created_at), 'PPp')}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Last Updated</label>
                <p className="text-sm">
                  {locationData.updated_at ? format(parseISO(locationData.updated_at), 'PPp') : 'Never'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Related Operations */}
        <Card>
          <CardHeader>
            <CardTitle>Related Operations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              View inventory and operations related to this location.
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => router.push(`/inventory?location_id=${locationId}`)}
              >
                View Inventory at this Location
              </Button>
              <Button 
                variant="outline" 
                onClick={() => router.push(`/sales?location_id=${locationId}`)}
              >
                View Sales from this Location
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}