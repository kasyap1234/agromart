"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import useSWR from 'swr';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import PageContainer from '@/components/layout/PageContainer';
import ProductFormSection from '@/components/products/ProductFormSection';
import { apiClient } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { Button } from "@/components/ui/button";
import { updateProductSchema } from '@/lib/schemas/product-schemas';
import { getProductFormSections } from '@/lib/configs/product-form-config';
import { ProductFormData } from '@/types/product-forms';
import { ProductUnit } from '@/types';

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params?.id) ? params?.id[0] : (params as any)?.id;
  const [submitting, setSubmitting] = useState(false);

  // Fetch product data
  const { data: productData, error: productError, isLoading: productLoading } = useSWR(
    id ? [`/products/${id}`] : null,
    () => apiClient.products.get(String(id))
  );

  // Fetch units
  const { data: unitsData, error: unitsError, isLoading: unitsLoading } = useSWR(
    ['/units'],
    () => apiClient.units.list()
  );

  const product = (productData as any)?.data || (productData as any) || {};
  const units = Array.isArray(unitsData) ? unitsData : (unitsData as any)?.data || [];

  // Form configuration
  const methods = useForm<ProductFormData>({
    resolver: zodResolver(updateProductSchema),
    mode: 'onChange',
    defaultValues: {
      sku: product.sku || '',
      name: product.name || '',
      description: product.description || '',
      brand: product.brand || '',
      category: product.category || '',
      subcategory: product.subcategory || '',
      tags: product.tags || [],
      cost_price: product.cost_price || 0,
      selling_price: product.selling_price || 0,
      tax_rate: product.tax_rate || 0,
      discount_percentage: product.discount_percentage || 0,
      unit_id: product.unit_id || '',
      min_stock_level: product.min_stock_level || 0,
      max_stock_level: product.max_stock_level || 0,
      reorder_point: product.reorder_point || 0,
      current_stock: product.current_stock || 0,
      weight: product.weight || 0,
      weight_unit: product.weight_unit || '',
      dimensions: product.dimensions || {},
      is_active: product.is_active ?? true,
      is_featured: product.is_featured ?? false,
      allow_backorders: product.allow_backorders ?? false,
      track_inventory: product.track_inventory ?? true,
      image_url: product.image_url || '',
      seo_title: product.seo_title || '',
      seo_description: product.seo_description || '',
      slug: product.slug || '',
    },
  });

  const {
    handleSubmit,
    formState: { isDirty, isValid },
    reset,
    watch,
  } = methods;

  // Watch category to update subcategory options
  const selectedCategory = watch('category');

  // Reset form when product data is loaded
  useEffect(() => {
    if (product && Object.keys(product).length > 0) {
      reset({
        sku: product.sku || '',
        name: product.name || '',
        description: product.description || '',
        brand: product.brand || '',
        category: product.category || '',
        subcategory: product.subcategory || '',
        tags: product.tags || [],
        cost_price: product.cost_price || 0,
        selling_price: product.selling_price || 0,
        tax_rate: product.tax_rate || 0,
        discount_percentage: product.discount_percentage || 0,
        unit_id: product.unit_id || '',
        min_stock_level: product.min_stock_level || 0,
        max_stock_level: product.max_stock_level || 0,
        reorder_point: product.reorder_point || 0,
        current_stock: product.current_stock || 0,
        weight: product.weight || 0,
        weight_unit: product.weight_unit || '',
        dimensions: product.dimensions || {},
        is_active: product.is_active ?? true,
        is_featured: product.is_featured ?? false,
        allow_backorders: product.allow_backorders ?? false,
        track_inventory: product.track_inventory ?? true,
        image_url: product.image_url || '',
        seo_title: product.seo_title || '',
        seo_description: product.seo_description || '',
        slug: product.slug || '',
      });
    }
  }, [product, reset]);

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
              options: units?.map((unit: ProductUnit) => ({
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
        name: data.name,
        description: data.description || undefined,
        brand: data.brand || undefined,
        category: data.category,
        subcategory: data.subcategory || undefined,
        tags: data.tags,
        cost_price: data.cost_price,
        selling_price: data.selling_price,
        tax_rate: data.tax_rate || undefined,
        discount_percentage: data.discount_percentage || undefined,
        unit_id: data.unit_id,
        min_stock_level: data.min_stock_level,
        max_stock_level: data.max_stock_level,
        reorder_point: data.reorder_point,
        current_stock: data.current_stock || undefined,
        weight: data.weight || undefined,
        weight_unit: data.weight_unit || undefined,
        dimensions: data.dimensions || undefined,
        is_active: data.is_active,
        is_featured: data.is_featured,
        allow_backorders: data.allow_backorders,
        track_inventory: data.track_inventory,
        image_url: data.image_url || undefined,
        seo_title: data.seo_title || undefined,
        seo_description: data.seo_description || undefined,
        slug: data.slug || undefined,
      };

      await apiClient.products.update(String(id), productData);
      toast.success('Product updated successfully');
      router.push(`/products/${id}`);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to update product';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (productLoading || unitsLoading) {
    return (
      <PageContainer
        title="Edit Product"
        description="Update product information"
      >
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </PageContainer>
    );
  }

  if (productError || unitsError) {
    return (
      <PageContainer
        title="Edit Product"
        description="Update product information"
      >
        <div className="py-8 text-red-600">
          Failed to load product or units data.
          <Button variant="outline" onClick={() => router.refresh()} className="ml-2">
            Retry
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Edit Product"
      description="Update your product details"
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
              onClick={() => router.push(`/products/${id}`)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !isDirty || !isValid}
            >
              {submitting ? 'Updating Product...' : 'Update Product'}
            </Button>
          </div>
        </form>
      </FormProvider>
    </PageContainer>
  );
}