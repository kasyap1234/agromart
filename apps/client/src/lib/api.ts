import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import Cookies from 'js-cookie';
import { toast } from 'react-hot-toast';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    // Handle common errors
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          // Unauthorized - redirect to login
          Cookies.remove('auth_token');
          Cookies.remove('refresh_token');
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login';
          }
          break;
        case 403:
          toast.error('Access denied. You do not have permission to perform this action.');
          break;
        case 429:
          toast.error('Too many requests. Please try again later.');
          break;
        case 500:
          toast.error('Server error. Please try again later.');
          break;
        default:
          if (data && typeof data === 'object' && 'message' in data) {
            toast.error(data.message as string);
          } else {
            toast.error('An unexpected error occurred.');
          }
      }
    } else if (error.request) {
      toast.error('Network error. Please check your connection.');
    } else {
      toast.error('An unexpected error occurred.');
    }
    
    return Promise.reject(error);
  }
);

// API Methods
export const apiClient = {
  // Generic methods
  get: <T>(url: string, params?: any): Promise<T> =>
    api.get(url, { params }).then((response) => response.data),
  
  post: <T>(url: string, data?: any): Promise<T> =>
    api.post(url, data).then((response) => response.data),
  
  put: <T>(url: string, data?: any): Promise<T> =>
    api.put(url, data).then((response) => response.data),
  
  patch: <T>(url: string, data?: any): Promise<T> =>
    api.patch(url, data).then((response) => response.data),
  
  delete: <T>(url: string): Promise<T> =>
    api.delete(url).then((response) => response.data),

  // Authentication
  auth: {
    login: (email: string, password: string) =>
      apiClient.post('/auth/login', { email, password }),
    
    register: (data: {
      email: string;
      password: string;
      first_name: string;
      last_name: string;
      company_name: string;
    }) => apiClient.post('/auth/register', data),
    
    logout: () => apiClient.post('/auth/logout'),
    
    me: () => apiClient.get('/auth/me'),
    
    refreshToken: (refreshToken: string) =>
      apiClient.post('/auth/refresh', { refresh_token: refreshToken }),
  },

  // Products
  products: {
    list: (params?: {
      page?: number;
      limit?: number;
      search?: string;
      category?: string;
      is_active?: boolean;
    }) => apiClient.get('/products', params),
    
    get: (id: string) => apiClient.get(`/products/${id}`),
    
    create: (data: {
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
    }) => apiClient.post('/products', data),
    
    update: (id: string, data: Partial<{
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
      is_active: boolean;
    }>) => apiClient.patch(`/products/${id}`, data),
    
    delete: (id: string) => apiClient.delete(`/products/${id}`),
    
    search: (query: string) => apiClient.get(`/products/search?q=${query}`),
  },

  // Product Units
  units: {
    list: () => apiClient.get('/units'),
    
    create: (data: { name: string; abbreviation: string }) =>
      apiClient.post('/units', data),
    
    update: (id: string, data: { name: string; abbreviation: string }) =>
      apiClient.put(`/units/${id}`, data),
    
    delete: (id: string) => apiClient.delete(`/units/${id}`),
  },

  // Inventory
  inventory: {
    list: (params?: {
      page?: number;
      limit?: number;
      search?: string;
    }) => apiClient.get('/inventory', params),
    
    getByProduct: (productId: string) =>
      apiClient.get(`/inventory/product/${productId}`),
    
    add: (data: {
      product_id: string;
      batch_id: string;
      quantity: number;
      notes?: string;
    }) => apiClient.post('/inventory/add', data),
    
    reduce: (data: {
      product_id: string;
      batch_id: string;
      quantity: number;
      notes?: string;
    }) => apiClient.post('/inventory/reduce', data),
    
    getLogs: (params?: {
      product_id?: string;
      batch_id?: string;
      page?: number;
      limit?: number;
    }) => apiClient.get('/inventory/logs', params),
  },

  // Batches
  batches: {
    create: (data: {
      product_id: string;
      batch_number: string;
      expiry_date: string;
      cost: number;
    }) => apiClient.post('/batches', data),
    
    get: (id: string) => apiClient.get(`/batches/${id}`),
    
    update: (id: string, data: {
      batch_number: string;
      expiry_date: string;
      cost: number;
    }) => apiClient.put(`/batches/${id}`, data),
  },

  // Reports
  reports: {
    lowStock: (threshold?: number) =>
      apiClient.get('/reports/low-stock', { threshold }),
    
    expiringBatches: (days?: number) =>
      apiClient.get('/reports/expiring-batches', { days }),
    
    inventoryValue: () =>
      apiClient.get('/reports/inventory-value'),
    
    dashboardStats: () =>
      apiClient.get('/reports/dashboard-stats'),
  },
};

// Utility functions
export const setAuthToken = (token: string) => {
  Cookies.set('auth_token', token, { expires: 7 }); // 7 days
};

export const setRefreshToken = (token: string) => {
  Cookies.set('refresh_token', token, { expires: 30 }); // 30 days
};

export const getAuthToken = (): string | undefined => {
  return Cookies.get('auth_token');
};

export const getRefreshToken = (): string | undefined => {
  return Cookies.get('refresh_token');
};

export const clearTokens = () => {
  Cookies.remove('auth_token');
  Cookies.remove('refresh_token');
};

export default api;
