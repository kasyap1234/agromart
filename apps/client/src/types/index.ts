// User and Authentication Types
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  tenant_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    token: string;
    refresh_token: string;
  };
  message: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  company_name: string;
}

// Product Types
export interface Product {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  sku: string;
  category: string;
  unit_id: string;
  unit_name?: string;
  min_stock_level: number;
  max_stock_level: number;
  reorder_point: number;
  cost_price: number;
  selling_price: number;
  tax_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductUnit {
  id: string;
  tenant_id: string;
  name: string;
  abbreviation: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProductRequest {
  name: string;
  description: string;
  sku: string;
  category: string;
  unit_id: string;
  min_stock_level: number;
  max_stock_level: number;
  reorder_point: number;
  cost_price: number;
  selling_price: number;
  tax_rate: number;
}

// Inventory Types
export interface Batch {
  id: string;
  tenant_id: string;
  product_id: string;
  batch_number: string;
  expiry_date: string;
  cost: number;
  created_at: string;
  updated_at: string;
}

export interface Inventory {
  id: string;
  tenant_id: string;
  product_id: string;
  batch_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface InventoryDetails {
  product_id: string;
  product_name: string;
  product_sku: string;
  batch_id: string;
  batch_number: string;
  quantity: number;
  expiry_date: string;
  cost: number;
  total_value: number;
}

export interface CreateBatchRequest {
  product_id: string;
  batch_number: string;
  expiry_date: string;
  cost: number;
}

export interface AddInventoryRequest {
  product_id: string;
  batch_id: string;
  quantity: number;
  notes?: string;
}

export interface ReduceInventoryRequest {
  product_id: string;
  batch_id: string;
  quantity: number;
  notes?: string;
}

export interface InventoryLog {
  id: string;
  tenant_id: string;
  product_id: string;
  product_name?: string;
  batch_id: string;
  batch_number?: string;
  reference_id: string;
  transaction_type: string;
  quantity_change: number;
  notes: string;
  created_at: string;
}

export interface LowStockItem {
  product_id: string;
  product_name: string;
  product_sku: string;
  current_quantity: number;
  min_stock_level: number;
  reorder_point: number;
}

export interface ExpiringBatch {
  batch_id: string;
  batch_number: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  expiry_date: string;
  quantity: number;
  days_until_expiry: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total?: number;
    total_pages?: number;
  };
}

export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
}

// Dashboard Types
export interface DashboardStats {
  total_products: number;
  low_stock_count: number;
  total_value: number;
  expiring_batches: number;
}

// Filter and Search Types
export interface ProductFilters {
  category?: string;
  is_active?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface InventoryFilters {
  product_id?: string;
  batch_id?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// Form Types
export interface FormError {
  field: string;
  message: string;
}

// Table Types
export interface TableColumn<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
}

export interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  onSort?: (key: keyof T, direction: 'asc' | 'desc') => void;
  onRowClick?: (row: T) => void;
}

// Modal Types
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

// Context Types
export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Utility Types
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// Export all types
export type {
  // Re-export commonly used types
  ApiResponse as API,
  PaginatedResponse as PaginatedAPI,
};
