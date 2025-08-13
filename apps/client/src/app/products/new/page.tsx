"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { apiClient } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProductUnit, CreateProductRequest } from '@/types';
import { cn } from '@/lib/utils';

const newProductSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Name is required'),
  price: z.preprocess(
    (val) => Number(val),
    z.number().min(0.01, 'Price must be a positive number')
  ),
  brand: z.string().optional(),
  description: z.string().optional(),
  unit_id: z.string().min(1, 'Unit is required'),
  price_per_unit: z.preprocess(
    (val) => Number(val),
    z.number().min(0.01, 'Price per unit must be a positive number')
  ),
  gst_percent: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number().min(0, 'GST % cannot be negative').max(100, 'GST % cannot exceed 100').optional()
  ),
});

type NewProductFormData = z.infer<typeof newProductSchema>;

export default function NewProductPage() {
  const router = useRouter();
  const { data: units, error: unitsError, isLoading: unitsLoading } = useSWR<ProductUnit[]>('/units', () => apiClient.units.list());
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, isValid },
    setValue,
    watch,
  } = useForm<NewProductFormData>({
    resolver: zodResolver(newProductSchema),
    mode: 'onChange',
  });

  const unitId = watch('unit_id');

  useEffect(() => {
    if (units && units.length > 0 && !unitId) {
      setValue('unit_id', units[0].id);
    }
  }, [units, unitId, setValue]);

  const onSubmit = async (data: NewProductFormData) => {
    setSubmitting(true);
    try {
      const productData: CreateProductRequest = {
        sku: data.sku,
        name: data.name,
        selling_price: data.price,
        description: data.description,
        brand: data.brand,
        unit_id: data.unit_id,
        cost_price: data.price_per_unit, // Assuming price_per_unit is cost_price
        tax_rate: data.gst_percent, // Assuming gst_percent is tax_rate
        category: "", // TODO: Add category field to form
        min_stock_level: 0, // TODO: Add min_stock_level field to form
        max_stock_level: 0, // TODO: Add max_stock_level field to form
        reorder_point: 0, // TODO: Add reorder_point field to form
      };

      const response = await apiClient.products.create(productData);
      const id = response?.data?.id || response?.id;
      toast.success('Product created successfully!');
      if (id) router.push(`/products/${id}`);
      else router.push('/products');
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to create product';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (unitsLoading) {
    return (
      <DashboardLayout title="New Product">
        <div className="py-8">Loading units...</div>
      </DashboardLayout>
    );
  }

  if (unitsError) {
    return (
      <DashboardLayout title="New Product">
        <div className="py-8 text-red-600">Failed to load units.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="New Product">
      <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="sku">SKU</Label>
            <Input
              id="sku"
              {...register('sku')}
              className={cn("mt-1", errors.sku && "border-destructive focus-visible:ring-destructive")}
              placeholder="Enter product SKU"
              aria-invalid={errors.sku ? "true" : "false"}
              aria-describedby="sku-error"
            />
            {errors.sku && (
              <p className="text-sm text-destructive" id="sku-error">
                {errors.sku.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              {...register('name')}
              className={cn("mt-1", errors.name && "border-destructive focus-visible:ring-destructive")}
              placeholder="Enter product name"
              aria-invalid={errors.name ? "true" : "false"}
              aria-describedby="name-error"
            />
            {errors.name && (
              <p className="text-sm text-destructive" id="name-error">
                {errors.name.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="price">Price</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              {...register('price')}
              className={cn("mt-1", errors.price && "border-destructive focus-visible:ring-destructive")}
              placeholder="Enter selling price"
              aria-invalid={errors.price ? "true" : "false"}
              aria-describedby="price-error"
            />
            {errors.price && (
              <p className="text-sm text-destructive" id="price-error">
                {errors.price.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="brand">Brand</Label>
            <Input
              id="brand"
              {...register('brand')}
              className="mt-1"
              placeholder="Enter brand name (optional)"
            />
          </div>
          <div>
            <Label htmlFor="unit_id">Unit</Label>
            <Select
              onValueChange={(value) => setValue('unit_id', value, { shouldValidate: true, shouldDirty: true })}
              value={unitId}
            >
              <SelectTrigger className={cn("mt-1", errors.unit_id && "border-destructive focus-visible:ring-destructive")}>
                <SelectValue placeholder="Select a unit" />
              </SelectTrigger>
              <SelectContent>
                {units?.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name} ({u.abbreviation})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.unit_id && (
              <p className="text-sm text-destructive" id="unit-error">
                {errors.unit_id.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="price_per_unit">Cost Price</Label>
            <Input
              id="price_per_unit"
              type="number"
              step="0.01"
              {...register('price_per_unit')}
              className={cn("mt-1", errors.price_per_unit && "border-destructive focus-visible:ring-destructive")}
              placeholder="Enter cost price per unit"
              aria-invalid={errors.price_per_unit ? "true" : "false"}
              aria-describedby="price-per-unit-error"
            />
            {errors.price_per_unit && (
              <p className="text-sm text-destructive" id="price-per-unit-error">
                {errors.price_per_unit.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="gst_percent">GST %</Label>
            <Input
              id="gst_percent"
              type="number"
              step="0.01"
              {...register('gst_percent')}
              className={cn("mt-1", errors.gst_percent && "border-destructive focus-visible:ring-destructive")}
              placeholder="Enter GST percentage (optional)"
              aria-invalid={errors.gst_percent ? "true" : "false"}
              aria-describedby="gst-percent-error"
            />
            {errors.gst_percent && (
              <p className="text-sm text-destructive" id="gst-percent-error">
                {errors.gst_percent.message}
              </p>
            )}
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={4}
              {...register('description')}
              className="mt-1"
              placeholder="Enter product description (optional)"
            />
          </div>
        </div>
        <div className="pt-2">
          <Button type="submit" disabled={submitting || !isDirty || !isValid}>
            {submitting ? 'Creating...' : 'Create product'}
          </Button>
        </div>
      </form>
    </DashboardLayout>
  );
}
