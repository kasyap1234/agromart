'use client'

import * as React from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Edit, Trash2, Package, AlertTriangle, Calendar, User, Building, DollarSign } from 'lucide-react'
import useSWR, { mutate } from 'swr'

import { apiClient } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { DeleteConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { Loading } from '@/components/ui/loading'

import ProductFormDialog from '../ProductFormDialog'

interface Product {
  id: string
  name: string
  sku: string
  description?: string
  category: string
  price: number
  unit: string
  status: 'active' | 'inactive'
  stockQuantity: number
  minStockLevel: number
  supplier?: {
    id: string
    name: string
    email?: string
    phone?: string
  }
  createdAt: string
  updatedAt: string
  createdBy?: {
    id: string
    name: string
  }
}

interface ProductPageProps {
  params: {
    id: string
  }
}

const PRODUCT_CATEGORIES = [
  'Seeds',
  'Fertilizers', 
  'Pesticides',
  'Tools',
  'Equipment',
  'Organic',
  'Others'
]

const PRODUCT_UNITS = [
  'kg',
  'lbs',
  'pieces',
  'liters',
  'gallons',
  'bags',
  'boxes'
]

export default function ProductDetailPage({ params }: ProductPageProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Fetch product data
  const { data: product, error, isLoading } = useSWR<Product>(
    params.id ? `/products/${params.id}` : null,
    () => apiClient.products.getById(params.id),
    {
      revalidateOnFocus: false,
      onError: (error) => {
        if (error.status === 404) {
          toast({
            title: 'Product Not Found',
            description: 'The product you are looking for does not exist.',
            variant: 'destructive',
          })
          router.push('/dashboard/products')
        }
      }
    }
  )

  // Permissions
  const canWrite = user?.role === 'admin' || user?.role === 'manager'
  const canDelete = user?.role === 'admin'

  // Handlers
  const handleEdit = () => {
    setShowEditDialog(true)
  }

  const handleDelete = () => {
    setShowDeleteDialog(true)
  }

  const performDelete = async () => {
    if (!product) return

    try {
      await apiClient.products.delete(product.id)
      toast({
        title: 'Success',
        description: 'Product deleted successfully',
      })
      router.push('/dashboard/products')
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete product',
        variant: 'destructive'
      })
    }
  }

  const handleFormSuccess = () => {
    mutate(`/products/${params.id}`)
    setShowEditDialog(false)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" disabled>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Button>
        </div>
        <Loading />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/products')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Button>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              Product not found or an error occurred.
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isLowStock = product.stockQuantity <= product.minStockLevel
  const stockPercentage = (product.stockQuantity / Math.max(product.minStockLevel * 2, 1)) * 100

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/products')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
            <p className="text-muted-foreground">SKU: {product.sku}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {canWrite && (
            <Button onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Product
            </Button>
          )}
          {canDelete && (
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Status Alert */}
      {isLowStock && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-orange-900 font-medium">Low Stock Alert</p>
                <p className="text-orange-800 text-sm">
                  Current stock ({product.stockQuantity} {product.unit}) is at or below the minimum level ({product.minStockLevel} {product.unit}).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Basic Information */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Product Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Product Name</label>
                <p className="font-medium">{product.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">SKU</label>
                <p className="font-medium font-mono">{product.sku}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Category</label>
                <Badge variant="secondary">{product.category}</Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <Badge variant={product.status === 'active' ? 'success' : 'secondary'}>
                  {product.status}
                </Badge>
              </div>
            </div>
            
            {product.description && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <p className="mt-1 text-sm leading-relaxed">{product.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pricing & Units */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pricing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Unit Price</label>
              <p className="text-2xl font-bold text-green-600">₹{product.price.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">per {product.unit}</p>
            </div>
            
            <Separator />
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Unit of Measurement</label>
              <p className="font-medium">{product.unit}</p>
            </div>
          </CardContent>
        </Card>

        {/* Stock Information */}
        <Card>
          <CardHeader>
            <CardTitle>Stock Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="text-sm font-medium text-muted-foreground">Current Stock</label>
                <span className={cn(
                  "text-sm font-medium",
                  isLowStock ? "text-orange-600" : "text-green-600"
                )}>
                  {product.stockQuantity} {product.unit}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={cn(
                    "h-2 rounded-full transition-all",
                    isLowStock ? "bg-orange-500" : "bg-green-500"
                  )}
                  style={{ width: `${Math.min(Math.max(stockPercentage, 5), 100)}%` }}
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Minimum Stock Level</label>
              <p className="font-medium">{product.minStockLevel} {product.unit}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Stock Value</label>
              <p className="font-bold text-lg">₹{(product.stockQuantity * product.price).toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Supplier Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Supplier
            </CardTitle>
          </CardHeader>
          <CardContent>
            {product.supplier ? (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Company Name</label>
                  <p className="font-medium">{product.supplier.name}</p>
                </div>
                {product.supplier.email && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-sm">{product.supplier.email}</p>
                  </div>
                )}
                {product.supplier.phone && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Phone</label>
                    <p className="text-sm">{product.supplier.phone}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-4">
                <Building className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No supplier assigned</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Metadata */}
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Audit Trail
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Created</label>
              <p className="text-sm">{new Date(product.createdAt).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
              {product.createdBy && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <User className="h-3 w-3" />
                  {product.createdBy.name}
                </p>
              )}
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
              <p className="text-sm">{new Date(product.updatedAt).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      {showEditDialog && (
        <ProductFormDialog
          open={showEditDialog}
          onClose={() => setShowEditDialog(false)}
          onSuccess={handleFormSuccess}
          product={product}
          categories={PRODUCT_CATEGORIES}
          units={PRODUCT_UNITS}
        />
      )}

      {showDeleteDialog && (
        <DeleteConfirmationDialog
          open={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={performDelete}
          title="Delete Product"
          description={`Are you sure you want to delete "${product.name}"? This action cannot be undone and will remove all associated data.`}
        />
      )}
    </div>
  )
}
