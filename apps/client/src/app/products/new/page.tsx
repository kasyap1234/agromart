"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PageContainer from '@/components/layout/PageContainer';
import ProductFormSection from '@/components/products/ProductFormSection';
import { apiClient } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { ProductUnit } from '@/types';
import { createProductSchema } from '@/lib/schemas/product-schemas';
import { getProductFormSections } from '@/lib/configs/product-form-config';
import { ProductFormData } from '@/types/product-forms';
import { cn } from '@/lib/utils';

type NewProductFormData = ProductFormData;

export default function NewProductPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  // Fetch units for the form
  const { data: units, error: unitsError, isLoading: unitsLoading } = useSWR<ProductUnit[]>(
    '/units',
    async () => {
      const result = await apiClient.units.list();
      return result as ProductUnit[];
    }
  );

  // Form configuration
  const methods = useForm<ProductFormData>({
    resolver: zodResolver(createProductSchema),
    mode: 'onChange',
    defaultValues: {
      is_active: true,
      is_featured: false,
      allow_backorders: false,
      track_inventory: true,
      tags: [],
    },
  });

  const {
    handleSubmit,
    formState: { isDirty, isValid, errors },
    setValue,
    watch,
  } = methods;

  // Watch category to update subcategory options
  const selectedCategory = watch('category');

  // Form sections configuration
  const formSections = getProductFormSections(
    undefined, // Use default categories
    selectedCategory ? { [selectedCategory]: [{ value: 'default', label: 'Default' }] } : undefined
  );

  // Update unit options dynamically
  const updatedFormSections = formSections.map(section => {
    if (section.id === 'inventory') {
      return {
        ...section,
        fields: section.fields.map(field => {
          if (field.name === 'unit_id') {
            return {
              ...field,
              options: units?.map(unit => ({
                value: unit.id,
                label: `${unit.name} (${unit.abbreviation})`,
              })) || [],
            };
          }
          return field;
        }),
      };
    }
    return section;
  });

  const onSubmit = async (data: ProductFormData) => {
    setSubmitting(true);
    try {
      // Transform form data to match API expectations
      const productData = {
        sku: data.sku,
        name: data.name,
        selling_price: data.selling_price,
        description: data.description || undefined,
        brand: data.brand || undefined,
        unit_id: data.unit_id,
        cost_price: data.cost_price,
        tax_rate: data.tax_rate || undefined,
        category: data.category,
        min_stock_level: data.min_stock_level,
        max_stock_level: data.max_stock_level,
        reorder_point: data.reorder_point,
        tags: data.tags,
        image_url: data.image_url || undefined,
        is_active: data.is_active,
        is_featured: data.is_featured,
        allow_backorders: data.allow_backorders,
        track_inventory: data.track_inventory,
      };

      const response = await apiClient.products.create(productData);
      const id = (response as any)?.data?.id || (response as any)?.id;
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
      <PageContainer
        title="New Product"
        description="Create a new product in your inventory"
      >
        <div className="py-8">Loading units...</div>
      </PageContainer>
    );
  }

  if (unitsError) {
    return (
      <PageContainer
        title="New Product"
        description="Create a new product in your inventory"
      >
        <div className="py-8 text-red-600">Failed to load units.</div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="New Product"
      description="Create a new product in your inventory"
    >
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {updatedFormSections.map((section) => (
            <ProductFormSection key={section.id} section={section} />
          ))}

          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/products')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !isDirty || !isValid}
            >
              {submitting ? 'Creating Product...' : 'Create Product'}
            </Button>
          </div>
        </form>
      </FormProvider>
    </PageContainer>
  );
}
