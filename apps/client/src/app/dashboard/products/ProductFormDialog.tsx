'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import useSWR from 'swr'

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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

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
  supplierId?: string
  supplier?: {
    id: string
    name: string
  }
}

interface Supplier {
  id: string
  name: string
  status: string
}

const productSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters'),
  sku: z.string().min(2, 'SKU must be at least 2 characters'),
  description: z.string().optional(),
  category: z.string().min(1, 'Please select a category'),
  price: z.number().min(0, 'Price must be greater than 0'),
  unit: z.string().min(1, 'Please select a unit'),
  status: z.enum(['active', 'inactive']),
  stockQuantity: z.number().min(0, 'Stock quantity must be greater than or equal to 0'),
  minStockLevel: z.number().min(0, 'Minimum stock level must be greater than or equal to 0'),
  supplierId: z.string().optional(),
})

type ProductFormData = z.infer<typeof productSchema>

interface ProductFormDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  product?: Product
  categories: string[]
  units: string[]
}

export default function ProductFormDialog({
  open,
  onClose,
  onSuccess,
  product,
  categories,
  units
}: ProductFormDialogProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isEditing = !!product

  // Fetch suppliers for dropdown
  const { data: suppliers } = useSWR<{ data: Supplier[] }>(
    open ? '/suppliers' : null,
    () => apiClient.suppliers.list({ status: 'active', limit: 100 }),
    { revalidateOnFocus: false }
  )

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      sku: '',
      description: '',
      category: '',
      price: 0,
      unit: '',
      status: 'active',
      stockQuantity: 0,
      minStockLevel: 0,
      supplierId: '',
    },
  })

  // Reset form when product changes or dialog opens
  useEffect(() => {
    if (open) {
      if (product) {
        form.reset({
          name: product.name,
          sku: product.sku,
          description: product.description || '',
          category: product.category,
          price: product.price,
          unit: product.unit,
          status: product.status,
          stockQuantity: product.stockQuantity,
          minStockLevel: product.minStockLevel,
          supplierId: product.supplier?.id || '',
        })
      } else {
        form.reset({
          name: '',
          sku: '',
          description: '',
          category: '',
          price: 0,
          unit: '',
          status: 'active',
          stockQuantity: 0,
          minStockLevel: 0,
          supplierId: '',
        })
      }
    }
  }, [product, open, form])

  const onSubmit = async (data: ProductFormData) => {
    try {
      setIsSubmitting(true)
      
      // Clean up data - remove empty strings for optional fields
      const submitData = {
        ...data,
        description: data.description?.trim() || undefined,
        supplierId: data.supplierId || undefined,
      }

      if (isEditing) {
        await apiClient.products.update(product.id, submitData)
        toast({
          title: 'Success',
          description: 'Product updated successfully',
        })
      } else {
        await apiClient.products.create(submitData)
        toast({
          title: 'Success',
          description: 'Product created successfully',
        })
      }
      
      onSuccess()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${isEditing ? 'update' : 'create'} product`,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const generateSKU = () => {
    const name = form.getValues('name')
    const category = form.getValues('category')
    
    if (!name || !category) {
      toast({
        title: 'Missing Information',
        description: 'Please enter product name and category first',
        variant: 'destructive',
      })
      return
    }

    // Generate SKU from category and name
    const categoryPrefix = category.substring(0, 3).toUpperCase()
    const namePrefix = name.replace(/\s+/g, '').substring(0, 3).toUpperCase()
    const randomNumber = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    
    const generatedSKU = `${categoryPrefix}-${namePrefix}-${randomNumber}`
    form.setValue('sku', generatedSKU)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Product' : 'Add New Product'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the product information below.' : 'Fill in the details to create a new product.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Product Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter product name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU *</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input placeholder="Enter SKU" {...field} />
                      </FormControl>
                      {!isEditing && (
                        <Button type="button" variant="outline" onClick={generateSKU}>
                          Generate
                        </Button>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter product description (optional)"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (₹) *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {units.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="stockQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Stock *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        min="0"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="minStockLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Stock Level *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        min="0"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="supplierId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supplier (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">No supplier</SelectItem>
                      {suppliers?.data?.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
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
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active Status</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Enable this product for sales and inventory tracking
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value === 'active'}
                      onCheckedChange={(checked) => 
                        field.onChange(checked ? 'active' : 'inactive')
                      }
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : isEditing ? 'Update Product' : 'Create Product'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
