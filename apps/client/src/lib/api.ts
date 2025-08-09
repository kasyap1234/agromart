import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import Cookies from 'js-cookie';
import { toast } from 'react-hot-toast';
import { AuthResponse } from '@/types';
import { MeResponse } from '@/types/auth';

// API Configuration
// In the browser, always use same-origin '/api' so requests are proxied by Next.js rewrites.
// On the server (SSR/ISR), honor NEXT_PUBLIC_API_URL if provided; default to '/api'.
const API_BASE_URL = typeof window === 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL || '/api')
  : '/api';

// Debug: surface base URL and token presence to console for diagnostics
if (typeof window !== 'undefined') {
  const t = Cookies.get('auth_token');
  // eslint-disable-next-line no-console
  console.debug('[API] Base URL:', API_BASE_URL, 'Token present:', !!t);
}

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
    let token: string | undefined;
    if (typeof window !== 'undefined') {
      token = Cookies.get('auth_token');
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      (config.headers as any)['X-Debug-Client'] = 'agromart-web';
    } else {
      (config.headers as any)['X-Debug-Client'] = 'agromart-web-no-token';
    }
    // eslint-disable-next-line no-console
    const dbgUrl = `${config.baseURL ?? ''}${config.url ?? ''}`;
    if (typeof window !== 'undefined') {
      console.debug('[API][REQ]', (config.method ?? 'GET').toUpperCase(), dbgUrl, {
        hasToken: !!token,
        params: config.params,
      });
    }
    return config;
  },
  (error) => {
    // eslint-disable-next-line no-console
    if (typeof window !== 'undefined') console.error('[API][REQ][ERR]', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // eslint-disable-next-line no-console
    if (typeof window !== 'undefined') console.debug('[API][RES]', response.config.url, response.status);
    return response;
  },
  (error: AxiosError) => {
    // eslint-disable-next-line no-console
    if (typeof window !== 'undefined')
      console.error('[API][RES][ERR]', {
        url: error.config?.url,
        status: error.response?.status,
        data: error.response?.data,
      });

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
            toast.error((data as any).message as string);
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
    // Normalize responses to the app's expected shape and
    // always hit the backend under /api/auth/*
    login: async (email: string, password: string): Promise<AuthResponse> => {
      const resp = await api.post('/auth/login', { email, password });
      const d = resp.data as any;
      return {
        success: true,
        data: {
          user: d.user,
          token: d.token,
          refresh_token: d.refresh_token,
        },
        message: 'Login successful',
      } as AuthResponse;
    },
    
    register: async (data: {
      email: string;
      password: string;
      first_name: string;
      last_name: string;
      company_name: string;
    }): Promise<AuthResponse> => {
      const resp = await api.post('/auth/register', data);
      const d = resp.data as any;
      return {
        success: true,
        data: {
          user: d.user,
          token: d.token,
          refresh_token: d.refresh_token,
        },
        message: 'Registration successful',
      } as AuthResponse;
    },
    
    logout: () => api.post('/auth/logout').then(r => r.data),
    
    me: (): Promise<MeResponse> => api.get('/auth/me').then(r => r.data),
    
    refreshToken: (refreshToken: string) =>
      api.post('/auth/refresh', { refresh_token: refreshToken }).then(r => r.data),
  },

  // Products
  products: {
    list: (params?: {
      page?: number;
      limit?: number;
      search?: string;
    }) => apiClient.get('/products', params),
    
    get: (id: string) => apiClient.get(`/products/${id}`),
    
    create: (data: {
      sku: string;
      name: string;
      price: number;
      description?: string;
      image_url?: string;
      brand?: string;
      unit_id: string;
      price_per_unit: number;
      gst_percent?: number;
    }) => apiClient.post('/products', data),
    
    // Server supports PATCH for product updates; align client to avoid 405
    update: (id: string, data: Partial<{
      name: string;
      price: number;
      description: string;
      image_url: string;
      brand: string;
      unit_id: string;
      price_per_unit: number;
      gst_percent: number;
    }>) => apiClient.patch(`/products/${id}`, data),
    
    delete: (id: string) => apiClient.delete(`/products/${id}`),
    
    search: (query: string, params?: { page?: number; limit?: number }) =>
      apiClient.get('/products/search', { q: query, ...(params || {}) }),
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

  // Suppliers
  suppliers: {
    list: (params?: { page?: number; limit?: number; search?: string; active?: boolean }) =>
      apiClient.get('/suppliers', params),
    search: (q: string, params?: { page?: number; limit?: number }) =>
      apiClient.get('/suppliers/search', { q, ...(params || {}) }),
    get: (id: string) => apiClient.get(`/suppliers/${id}`),
    create: (data: { name: string; email?: string; phone?: string; address?: string }) =>
      apiClient.post('/suppliers', data),
    update: (id: string, data: { name?: string; email?: string; phone?: string; address?: string }) =>
      apiClient.put(`/suppliers/${id}`, data),
    delete: (id: string) => apiClient.delete(`/suppliers/${id}`),
  },

  // Customers
  customers: {
    list: (params?: { page?: number; limit?: number; search?: string; active?: boolean }) =>
      apiClient.get('/customers', params),
    search: (q: string, params?: { page?: number; limit?: number }) =>
      apiClient.get('/customers/search', { q, ...(params || {}) }),
    get: (id: string) => apiClient.get(`/customers/${id}`),
    create: (data: { name: string; email?: string; phone?: string; address?: string }) =>
      apiClient.post('/customers', data),
    update: (id: string, data: { name?: string; email?: string; phone?: string; address?: string }) =>
      apiClient.put(`/customers/${id}`, data),
    delete: (id: string) => apiClient.delete(`/customers/${id}`),
  },

  // Purchase Orders
  purchaseOrders: {
    list: (params?: { page?: number; limit?: number; status?: string }) =>
      apiClient.get('/purchase-orders', params),
    get: (id: string) => apiClient.get(`/purchase-orders/${id}`),
    create: (data: any) => apiClient.post('/purchase-orders', data),
    updateStatus: (id: string, status: string) => apiClient.put(`/purchase-orders/${id}/status`, { status }),
    receive: (id: string, data: any) => apiClient.post(`/purchase-orders/${id}/receive`, data),
    exportCsv: (params?: { from?: string; to?: string }) =>
      apiClient.get('/purchase-orders.csv', params),
  },

  // Sales
  sales: {
    exportCsv: (params?: { from?: string; to?: string }) => apiClient.get('/sales/orders.csv', params),
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
    
    // Backend lacks PUT /batches/:id; disable until implemented
    update: (_id: string, _data: {
      batch_number: string;
      expiry_date: string;
      cost: number;
    }) => {
      throw new Error('Batch update is not supported by the backend');
    },
    
    delete: (id: string) => apiClient.delete(`/batches/${id}`),
  },

  // Reports
  reports: {
    lowStock: (threshold?: number) =>
      apiClient.get('/reports/low-stock', { threshold }),

    expiringBatches: (days?: number) =>
      apiClient.get('/reports/expiring-batches', { days }),

    inventoryValue: () => apiClient.get('/reports/inventory-value'),

    dashboardStats: () => apiClient.get('/reports/dashboard-stats'),
  },

  // Audit Logs
  auditLogs: {
    list: (params?: {
      page?: number;
      limit?: number;
      action?: string;
      entity_type?: string;
      user_id?: string;
      start_date?: string;
      end_date?: string;
    }) => apiClient.get('/inventory/logs', params),

    getByProduct: (productId: string, params?: {
      page?: number;
      limit?: number;
    }) => apiClient.get(`/inventory/logs`, { product_id: productId, ...params }),

    getByBatch: (batchId: string, params?: {
      page?: number;
      limit?: number;
    }) => apiClient.get(`/inventory/logs`, { batch_id: batchId, ...params }),

    export: (params?: {
      format?: 'csv' | 'pdf';
      start_date?: string;
      end_date?: string;
    }) => apiClient.get('/inventory/logs/export', params),
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
