'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { apiClient } from '@/lib/api'
import useSWR from 'swr'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  MapPin,
  Plus,
  Search,
  Edit3,
  Trash2,
  Building2,
  Home,
  Package,
  Filter,
  MoreVertical,
  Eye
} from 'lucide-react'
import toast from 'react-hot-toast'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Location {
  id: string
  name: string
  type: string
  address?: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

const locationSchema = z.object({
  name: z.string().min(1, 'Location name is required').max(100, 'Name must be less than 100 characters'),
  type: z.string().min(1, 'Location type is required'),
  address: z.string().optional(),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
})

type LocationFormData = z.infer<typeof locationSchema>

const LOCATION_TYPES = [
  { value: 'warehouse', label: 'Warehouse', icon: Package },
  { value: 'store', label: 'Store', icon: Building2 },
  { value: 'office', label: 'Office', icon: Building2 },
  { value: 'farm', label: 'Farm', icon: Home },
  { value: 'distribution', label: 'Distribution Center', icon: Package },
  { value: 'other', label: 'Other', icon: MapPin },
]

export default function LocationsPage() {
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch locations data
  const { data: locationsData, error, isLoading, mutate } = useSWR(
    ['locations', page, limit, search, typeFilter, statusFilter],
    () => {
      const params: any = { page, limit }
      if (search.trim()) params.search = search.trim()
      if (typeFilter !== 'all') params.type = typeFilter
      return apiClient.locations.list(params)
    },
    { keepPreviousData: true }
  )

  const locations: Location[] = Array.isArray(locationsData) ? locationsData : (locationsData as any)?.data || []
  const totalPages = Math.ceil(((locationsData as any)?.total || locations.length) / limit)

  // Form handling
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      is_active: true
    }
  })

  const watchedType = watch('type')

  // Reset form when dialog closes
  useEffect(() => {
    if (!showCreateDialog && !showEditDialog) {
      reset({
        name: '',
        type: '',
        address: '',
        description: '',
        is_active: true,
      })
      setSelectedLocation(null)
    }
  }, [showCreateDialog, showEditDialog, reset])

  // Populate form when editing
  useEffect(() => {
    if (selectedLocation && showEditDialog) {
      reset({
        name: selectedLocation.name,
        type: selectedLocation.type,
        address: selectedLocation.address || '',
        description: selectedLocation.description || '',
        is_active: selectedLocation.is_active,
      })
    }
  }, [selectedLocation, showEditDialog, reset])

  const onSubmit = async (data: LocationFormData) => {
    if (isSubmitting) return

    setIsSubmitting(true)
    try {
      if (selectedLocation) {
        await apiClient.locations.update(selectedLocation.id, data)
        toast.success('Location updated successfully')
        setShowEditDialog(false)
      } else {
        await apiClient.locations.create(data)
        toast.success('Location created successfully')
        setShowCreateDialog(false)
      }

      mutate()
      reset()
      setSelectedLocation(null)
    } catch (error: any) {
      toast.error(error?.message || 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedLocation || isSubmitting) return

    setIsSubmitting(true)
    try {
      await apiClient.locations.delete(selectedLocation.id)
      toast.success('Location deleted successfully')
      setShowDeleteDialog(false)
      mutate()
      setSelectedLocation(null)
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete location')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleView = (location: Location) => {
    setSelectedLocation(location)
    setShowViewDialog(true)
  }

  const handleEdit = (location: Location) => {
    setSelectedLocation(location)
    setShowEditDialog(true)
  }

  const handleDeleteClick = (location: Location) => {
    setSelectedLocation(location)
    setShowDeleteDialog(true)
  }

  const getLocationTypeIcon = (type: string) => {
    const locationTypeConfig = LOCATION_TYPES.find(t => t.value === type)
    const IconComponent = locationTypeConfig?.icon || MapPin
    return <IconComponent className="h-4 w-4" />
  }

  const getLocationTypeLabel = (type: string) => {
    return LOCATION_TYPES.find(t => t.value === type)?.label || type
  }

  const isManager = user?.role === 'admin' || user?.role === 'manager'

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-900">Error loading locations</p>
          <p className="text-sm text-gray-500 mt-1">Please try refreshing the page</p>
          <Button onClick={() => mutate()} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Locations</h1>
          <p className="text-muted-foreground">
            Manage warehouses, stores, and distribution centers
          </p>
        </div>
        {isManager && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Location
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <form onSubmit={handleSubmit(onSubmit)}>
                <DialogHeader>
                  <DialogTitle>Add New Location</DialogTitle>
                  <DialogDescription>
                    Create a new location for inventory management
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Location Name *</Label>
                    <Input
                      id="name"
                      placeholder="Enter location name"
                      {...register('name')}
                      className={errors.name ? 'border-red-500' : ''}
                    />
                    {errors.name && (
                      <p className="text-sm text-red-500">{errors.name.message}</p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="type">Location Type *</Label>
                    <Select onValueChange={(value) => setValue('type', value)}>
                      <SelectTrigger className={errors.type ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select location type" />
                      </SelectTrigger>
                      <SelectContent>
                        {LOCATION_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <type.icon className="h-4 w-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.type && (
                      <p className="text-sm text-red-500">{errors.type.message}</p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      placeholder="Enter location address"
                      {...register('address')}
                      rows={2}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Enter location description"
                      {...register('description')}
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={watch('is_active')}
                      onCheckedChange={(checked) => setValue('is_active', checked)}
                    />
                    <Label htmlFor="is_active">Active Location</Label>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Create Location'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search locations..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {LOCATION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Locations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Locations ({locations.length})</CardTitle>
          <CardDescription>
            Manage your business locations and facilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">Loading locations...</p>
              </div>
            </div>
          ) : locations.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No locations found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {search || typeFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Get started by creating your first location.'
                }
              </p>
              {isManager && !search && typeFilter === 'all' && statusFilter === 'all' && (
                <Button
                  className="mt-4"
                  onClick={() => setShowCreateDialog(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Location
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Location</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locations.map((location) => (
                    <TableRow key={location.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{location.name}</div>
                          {location.description && (
                            <div className="text-sm text-muted-foreground">
                              {location.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getLocationTypeIcon(location.type)}
                          {getLocationTypeLabel(location.type)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {location.address ? (
                          <div className="max-w-[200px] truncate" title={location.address}>
                            {location.address}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={location.is_active ? 'default' : 'secondary'}>
                          {location.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleView(location)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {isManager && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleEdit(location)}>
                                  <Edit3 className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteClick(location)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 py-4">
              <div className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Location Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Location Details</DialogTitle>
            <DialogDescription>
              View location information
            </DialogDescription>
          </DialogHeader>

          {selectedLocation && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label className="text-sm font-medium">Location Name</Label>
                <div className="text-sm">{selectedLocation.name}</div>
              </div>

              <div className="grid gap-2">
                <Label className="text-sm font-medium">Type</Label>
                <div className="flex items-center gap-2 text-sm">
                  {getLocationTypeIcon(selectedLocation.type)}
                  {getLocationTypeLabel(selectedLocation.type)}
                </div>
              </div>

              {selectedLocation.address && (
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Address</Label>
                  <div className="text-sm">{selectedLocation.address}</div>
                </div>
              )}

              {selectedLocation.description && (
                <div className="grid gap-2">
                  <Label className="text-sm font-medium">Description</Label>
                  <div className="text-sm">{selectedLocation.description}</div>
                </div>
              )}

              <div className="grid gap-2">
                <Label className="text-sm font-medium">Status</Label>
                <Badge variant={selectedLocation.is_active ? 'default' : 'secondary'} className="w-fit">
                  {selectedLocation.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              <div className="grid gap-2">
                <Label className="text-sm font-medium">Created</Label>
                <div className="text-sm">
                  {new Date(selectedLocation.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowViewDialog(false)}
            >
              Close
            </Button>
            {isManager && selectedLocation && (
              <Button
                onClick={() => {
                  setShowViewDialog(false)
                  handleEdit(selectedLocation)
                }}
              >
                <Edit3 className="mr-2 h-4 w-4" />
                Edit Location
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Location Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[525px]">
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Edit Location</DialogTitle>
              <DialogDescription>
                Update location information
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Location Name *</Label>
                <Input
                  id="edit-name"
                  placeholder="Enter location name"
                  {...register('name')}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-type">Location Type *</Label>
                <Select value={watchedType} onValueChange={(value) => setValue('type', value)}>
                  <SelectTrigger className={errors.type ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select location type" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.type && (
                  <p className="text-sm text-red-500">{errors.type.message}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-address">Address</Label>
                <Textarea
                  id="edit-address"
                  placeholder="Enter location address"
                  {...register('address')}
                  rows={2}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  placeholder="Enter location description"
                  {...register('description')}
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-is_active"
                  checked={watch('is_active')}
                  onCheckedChange={(checked) => setValue('is_active', checked)}
                />
                <Label htmlFor="edit-is_active">Active Location</Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Update Location'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the location "{selectedLocation?.name}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
