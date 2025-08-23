// Enhanced Product Form Types with Advanced Validation
export interface ProductFormData {
  // Basic Information
  sku: string;
  name: string;
  description?: string;
  brand?: string;
  image_url?: string;

  // Categorization
  category: string;
  subcategory?: string;
  tags: string[];

  // Pricing
  cost_price: number;
  selling_price: number;
  tax_rate?: number;
  discount_percentage?: number;

  // Inventory Management
  unit_id: string;
  min_stock_level: number;
  max_stock_level: number;
  reorder_point: number;
  current_stock?: number;

  // Physical Properties
  weight?: number;
  weight_unit?: string;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit?: string;
  };

  // Additional Settings
  is_active: boolean;
  is_featured: boolean;
  allow_backorders: boolean;
  track_inventory: boolean;

  // Supplier Information
  supplier_id?: string;
  supplier_sku?: string;

  // SEO and Display
  seo_title?: string;
  seo_description?: string;
  slug?: string;
}

export interface ProductFormErrors {
  sku?: string;
  name?: string;
  description?: string;
  category?: string;
  cost_price?: string;
  selling_price?: string;
  min_stock_level?: string;
  max_stock_level?: string;
  reorder_point?: string;
  unit_id?: string;
  tags?: string;
}

export interface FormFieldConfig {
  name: string; // Changed from keyof ProductFormData to allow nested properties
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea' | 'tags' | 'checkbox' | 'image';
  required?: boolean;
  placeholder?: string;
  description?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: RegExp;
    custom?: (value: any) => string | null;
  };
  dependencies?: {
    field: string;
    condition: (value: any) => boolean;
  };
  options?: { label: string; value: string }[];
  conditional?: {
    field: string;
    value: any;
    showWhen: boolean;
  };
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormFieldConfig[];
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  subcategories?: ProductCategory[];
  requires_dimensions?: boolean;
  requires_weight?: boolean;
  requires_supplier?: boolean;
}

export interface ValidationRule {
  field: keyof ProductFormData;
  rule: 'required' | 'min' | 'max' | 'pattern' | 'custom' | 'conditional';
  value?: any;
  message: string;
  condition?: (formData: ProductFormData) => boolean;
}

export interface FormState {
  data: Partial<ProductFormData>;
  errors: ProductFormErrors;
  isDirty: boolean;
  isValid: boolean;
  isSubmitting: boolean;
  submitCount: number;
}

export interface FormConfig {
  mode: 'create' | 'edit' | 'view';
  productId?: string;
  initialData?: Partial<ProductFormData>;
  validationMode?: 'onChange' | 'onBlur' | 'onSubmit';
  enableAutoSave?: boolean;
  enableRealTimeValidation?: boolean;
  showProgress?: boolean;
}

// Export types for use in components
export type ProductFormField = keyof ProductFormData;
export type ProductFormSection = FormSection;
export type ProductFormConfig = FormConfig;