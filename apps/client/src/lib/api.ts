import axios, { AxiosInstance, AxiosResponse, AxiosError } from "axios";
import Cookies from "js-cookie";
import { toast } from "react-hot-toast";
import { AuthResponse } from "@/types";
import { MeResponse } from "@/types/auth";
import { createNetworkError, createAuthError, createBusinessError } from "@/hooks/useErrorHandler";

// API Configuration
// Use /api for frontend calls which will be proxied to backend via Next.js API routes
const API_BASE_URL =
  typeof window === "undefined"
    ? process.env.NEXT_PUBLIC_API_URL || "/api"
    : "/api";

// Debug: surface base URL and token presence to console for diagnostics (only in development)
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const t = Cookies.get("auth_token");
  // eslint-disable-next-line no-console
  console.debug("[API] Base URL:", API_BASE_URL, "Token present:", !!t);
}

// Create axios instance with optimized settings
const api: AxiosInstance = axios.create({
   baseURL: API_BASE_URL,
   timeout: 15000, // Reduced timeout for better UX
   headers: {
     "Content-Type": "application/json",
   },
   // Enable compression and connection reuse
   decompress: true,
   maxRedirects: 3,
 });

// Request deduplication cache
const pendingRequests = new Map();

// Request interceptor to add auth token and handle deduplication
api.interceptors.request.use(
  (config) => {
    let token: string | undefined;
    if (typeof window !== "undefined") {
      token = Cookies.get("auth_token") || undefined;
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Create request key for deduplication
    const requestKey = `${config.method}-${config.url}-${JSON.stringify(config.params || {})}`;

    // Check if request is already pending
    if (config.method?.toLowerCase() === 'get' && pendingRequests.has(requestKey)) {
      // Cancel this request and return the pending one
      const cancelToken = axios.CancelToken.source();
      config.cancelToken = cancelToken.token;
      cancelToken.cancel('Request deduplicated');
      return pendingRequests.get(requestKey);
    }

    // Store the request promise for deduplication
    if (config.method?.toLowerCase() === 'get') {
      const requestPromise = api.request(config);
      pendingRequests.set(requestKey, requestPromise);

      // Clean up after request completes
      requestPromise.finally(() => {
        pendingRequests.delete(requestKey);
      });

      return requestPromise;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Enhanced response interceptor with structured error handling
api.interceptors.response.use(
   (response: AxiosResponse) => {
     return response;
   },
   (error: AxiosError) => {
     // Enhanced error handling with structured error types
     if (error.response) {
       const { status, data } = error.response;
       const errorMessage = data && typeof data === "object" && "error" in data
         ? (data as any).error?.message || (data as any).message
         : "An unexpected error occurred";

       switch (status) {
         case 400:
           // Bad Request - often validation errors
           throw createBusinessError(errorMessage || "Invalid request data", "VALIDATION_ERROR");
         case 401:
           // Unauthorized - clear tokens and redirect
           if (typeof window !== "undefined") {
             clearTokens();
             window.location.href = "/auth/login";
           }
           throw createAuthError(errorMessage || "Authentication required");
         case 403:
           // Forbidden - permission denied
           throw createAuthError(errorMessage || "Access denied. You do not have permission to perform this action.", "FORBIDDEN");
         case 404:
           // Not Found
           throw createBusinessError(errorMessage || "The requested resource was not found", "NOT_FOUND");
         case 409:
           // Conflict - resource already exists
           throw createBusinessError(errorMessage || "Resource already exists", "CONFLICT");
         case 422:
           // Unprocessable Entity - validation failed
           throw createBusinessError(errorMessage || "Validation failed", "VALIDATION_FAILED");
         case 429:
           // Too Many Requests - rate limited
           throw createNetworkError(errorMessage || "Too many requests. Please try again later.", status);
         case 500:
         case 502:
         case 503:
         case 504:
           // Server errors
           throw createNetworkError(errorMessage || "Server error. Please try again later.", status);
         default:
           // Other errors
           throw createNetworkError(errorMessage || "An unexpected error occurred", status);
       }
     } else if (error.request) {
       // Network error - no response received
       throw createNetworkError(
         "Network error. Please check your connection and try again.",
         0,
         error as Error
       );
     } else {
       // Request setup error
       throw createNetworkError(
         error.message || "An unexpected error occurred",
         0,
         error
       );
     }
   },
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
    login: async (email: string, password: string): Promise<AuthResponse> => {
      const resp = await api.post("/auth/login", { email, password });
      return resp.data;
    },

    register: async (data: {
      email: string;
      password: string;
      first_name: string;
      last_name: string;
      company_name: string;
    }): Promise<AuthResponse> => {
      const resp = await api.post("/auth/register", data);
      return resp.data;
    },

    logout: () => api.post("/auth/logout").then((r) => r.data),

    me: (): Promise<MeResponse> => api.get("/auth/me").then((r) => r.data),

    refreshToken: (refreshToken: string) =>
      api
        .post("/auth/refresh", { refresh_token: refreshToken })
        .then((r) => r.data),
  },

  // Products
  products: {
    list: (params?: { page?: number; limit?: number; search?: string }) =>
      apiClient.get("/products", params),

    get: (id: string) => apiClient.get(`/products/${id}`),

    create: (data: {
      sku: string;
      name: string;
      selling_price: number;
      description?: string;
      image_url?: string;
      brand?: string;
      unit_id: string;
      cost_price: number;
      tax_rate?: number;
      category?: string;
      min_stock_level?: number;
      max_stock_level?: number;
      reorder_point?: number;
    }) => apiClient.post("/products", data),

    // Server supports PATCH for product updates; align client to avoid 405
    update: (
      id: string,
      data: Partial<{
        name: string;
        selling_price: number;
        description: string;
        image_url: string;
        brand: string;
        unit_id: string;
        cost_price: number;
        tax_rate: number;
        category: string;
        min_stock_level: number;
        max_stock_level: number;
        reorder_point: number;
      }>,
    ) => apiClient.patch(`/products/${id}`, data),

    delete: (id: string) => apiClient.delete(`/products/${id}`),

    search: (query: string, params?: { page?: number; limit?: number }) =>
      apiClient.get("/products/search", { q: query, ...(params || {}) }),
  },

  // Product Units (Backend endpoint is /products/units, not /units)
  units: {
    list: () => apiClient.get("/products/units"),
  },

  // Inventory
  inventory: {
    list: (params?: { page?: number; limit?: number; search?: string }) =>
      apiClient.get("/inventory", params),

    getByProduct: (productId: string) =>
      apiClient.get(`/inventory/product/${productId}`),

    add: (data: {
      product_id: string;
      batch_id: string;
      quantity: number;
      notes?: string;
    }) => apiClient.post("/inventory/add", data),

    reduce: (data: {
      product_id: string;
      batch_id: string;
      quantity: number;
      notes?: string;
    }) => apiClient.post("/inventory/reduce", data),

    getLogs: (params?: {
      product_id?: string;
      batch_id?: string;
      page?: number;
      limit?: number;
    }) => apiClient.get("/inventory/logs", params),
  },

  // Suppliers
  suppliers: {
    list: (params?: {
      page?: number;
      limit?: number;
      search?: string;
      active?: boolean;
    }) => apiClient.get("/suppliers", params),
    search: (q: string, params?: { page?: number; limit?: number }) =>
      apiClient.get("/suppliers/search", { q, ...(params || {}) }),
    get: (id: string) => apiClient.get(`/suppliers/${id}`),
    create: (data: {
      name: string;
      email?: string;
      phone?: string;
      address?: string;
    }) => apiClient.post("/suppliers", data),
    update: (
      id: string,
      data: { name?: string; email?: string; phone?: string; address?: string },
    ) => apiClient.put(`/suppliers/${id}`, data),
    delete: (id: string) => apiClient.delete(`/suppliers/${id}`),
  },

  // Customers
  customers: {
    list: (params?: {
      page?: number;
      limit?: number;
      search?: string;
      active?: boolean;
    }) => apiClient.get("/customers", params),
    search: (q: string, params?: { page?: number; limit?: number }) =>
      apiClient.get("/customers/search", { q, ...(params || {}) }),
    get: (id: string) => apiClient.get(`/customers/${id}`),
    create: (data: {
      name: string;
      email?: string;
      phone?: string;
      address?: string;
    }) => apiClient.post("/customers", data),
    update: (
      id: string,
      data: { name?: string; email?: string; phone?: string; address?: string },
    ) => apiClient.put(`/customers/${id}`, data),
    delete: (id: string) => apiClient.delete(`/customers/${id}`),
  },

  // Purchase Orders
  purchaseOrders: {
    list: (params?: { page?: number; limit?: number; status?: string }) =>
      apiClient.get("/purchase-orders", params),
    get: (id: string) => apiClient.get(`/purchase-orders/${id}`),
    create: (data: any) => apiClient.post("/purchase-orders", data),
    updateStatus: (id: string, status: string) =>
      apiClient.put(`/purchase-orders/${id}/status`, { status }),
    receive: (id: string, data: any) =>
      apiClient.post(`/purchase-orders/${id}/receive`, data),
    exportCsv: (params?: { from?: string; to?: string }) =>
      apiClient.get("/purchase-orders.csv", params),
  },

  // Sales
  sales: {
    exportCsv: (params?: { from?: string; to?: string }) =>
      apiClient.get("/sales/orders.csv", params),

    orders: {
      list: (params?: {
        page?: number;
        limit?: number;
        status?: string;
        customer_id?: string;
      }) => apiClient.get("/sales/orders", params),

      get: (id: string) => apiClient.get(`/sales/orders/${id}`),

      create: (data: any) => apiClient.post("/sales/orders", data),

      updateStatus: (id: string, status: string) =>
        apiClient.put(`/sales/orders/${id}/status`, { status }),
    },
  },

  // Batches
  batches: {
    list: (params?: { page?: number; limit?: number }) =>
      apiClient.get("/batches", params),
    create: (data: {
      product_id: string;
      batch_number: string;
      expiry_date: string;
      cost: number;
    }) => apiClient.post("/batches", data),

    get: (id: string) => apiClient.get(`/batches/${id}`),

    update: (
      id: string,
      data: {
        batch_number: string;
        expiry_date: string;
        cost: number;
      },
    ) => apiClient.put(`/batches/${id}`, data),

    delete: (id: string) => apiClient.delete(`/batches/${id}`),
  },

  // Analytics
  analytics: {
    getKPIs: (params?: {
      from_date?: string;
      to_date?: string;
      threshold?: number;
      top?: number;
      window_days?: number;
    }) => apiClient.get("/analytics/kpis", params),

    getSalesSeries: (params?: {
      from_date?: string;
      to_date?: string;
      group?: 'day' | 'month';
    }) => apiClient.get("/analytics/sales", params),

    getPurchasesSeries: (params?: {
      from_date?: string;
      to_date?: string;
      group?: 'day' | 'month';
    }) => apiClient.get("/analytics/purchases", params),

    getInventorySnapshot: () => apiClient.get("/analytics/inventory"),
  },

  // Reports
  reports: {
    lowStock: (threshold?: number) =>
      apiClient.get("/reports/low-stock", { threshold }),

    expiringBatches: (days?: number) =>
      apiClient.get("/reports/expiring-batches", { days }),

    inventoryValue: () => apiClient.get("/reports/inventory-value"),

    dashboardStats: () => apiClient.get("/reports/dashboard-stats"),

    // Additional report endpoints for purchase orders
    productMovement: (params?: { from?: string; to?: string }) =>
      apiClient.get("/reports/product-movement", params),

    supplierPurchaseSummary: (params?: { from?: string; to?: string }) =>
      apiClient.get("/reports/supplier-purchase-summary", params),

    // Export functionality
    analytics: (params?: {
      startDate?: string;
      endDate?: string;
      type?: string;
    }) => apiClient.get("/reports/analytics", params),

    export: (params: {
      format: 'csv' | 'pdf';
      type: string;
      startDate?: string;
      endDate?: string;
    }) => apiClient.get("/reports/export", params),
  },

  // Settings & Profile
  settings: {
    getTenant: () => apiClient.get("/settings/tenant"),
    updateTenant: (data: any) => apiClient.put("/settings/tenant", data),
    getNotifications: () => apiClient.get("/settings/notifications"),
    updateNotifications: (data: any) =>
      apiClient.put("/settings/notifications", data),
  },

  profile: {
    get: () => apiClient.get("/users/me"),
    update: (data: any) => apiClient.put("/users/me", data),
  },

  // Users Management
  users: {
    list: (params?: {
      page?: number;
      limit?: number;
      search?: string;
      role?: string;
      status?: 'active' | 'inactive';
      sort_by?: string;
      sort_order?: 'asc' | 'desc';
    }) => apiClient.get("/users", params),

    search: (q: string, params?: { page?: number; limit?: number }) =>
      apiClient.get("/users/search", { q, ...(params || {}) }),

    get: (id: string) => apiClient.get(`/users/${id}`),

    create: (data: {
      name: string;
      email: string;
      password: string;
      phone?: string;
      role: 'admin' | 'manager' | 'user';
      profile_photo?: string;
    }) => apiClient.post("/users", data),

    update: (id: string, data: {
      name?: string;
      email?: string;
      phone?: string;
      role?: 'admin' | 'manager' | 'user';
      is_active?: boolean;
      profile_photo?: string;
    }) => apiClient.put(`/users/${id}`, data),

    delete: (id: string) => apiClient.delete(`/users/${id}`),

    bulkDelete: (ids: string[]) => apiClient.post("/users/bulk/delete", { ids }),

    bulkUpdateStatus: (ids: string[], is_active: boolean) =>
      apiClient.post("/users/bulk/status", { ids, is_active }),

    resetPassword: (id: string, data: { new_password: string }) =>
      apiClient.post(`/users/${id}/reset-password`, data),

    changePassword: (id: string, data: { current_password: string; new_password: string }) =>
      apiClient.post(`/users/${id}/change-password`, data),

    uploadProfilePhoto: (id: string, file: File) => {
      const formData = new FormData();
      formData.append('profile_photo', file);
      return api.post(`/users/${id}/upload-profile-photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((response) => response.data);
    },

    deleteProfilePhoto: (id: string) => apiClient.delete(`/users/${id}/profile-photo`),
  },

  // Locations
  locations: {
    list: (params?: {
      page?: number;
      limit?: number;
      search?: string;
      type?: string;
    }) => apiClient.get("/locations", params),

    get: (id: string) => apiClient.get(`/locations/${id}`),

    create: (data: {
      name: string;
      type: string;
      address?: string;
      description?: string;
      is_active?: boolean;
    }) => apiClient.post("/locations", data),

    update: (id: string, data: {
      name?: string;
      type?: string;
      address?: string;
      description?: string;
      is_active?: boolean;
    }) => apiClient.put(`/locations/${id}`, data),

    delete: (id: string) => apiClient.delete(`/locations/${id}`),

    search: (q: string, params?: { page?: number; limit?: number }) =>
      apiClient.get("/locations/search", { q, ...params }),
  },

  // File Upload
  files: {
    upload: (file: File, params?: {
      entity_type?: string;
      entity_id?: string;
      file_type?: string;
    }) => {
      const formData = new FormData();
      formData.append('file', file);
      if (params?.entity_type) formData.append('entity_type', params.entity_type);
      if (params?.entity_id) formData.append('entity_id', params.entity_id);
      if (params?.file_type) formData.append('file_type', params.file_type);
      
      return api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((response) => response.data);
    },

    get: (id: string) => apiClient.get(`/files/${id}`),

    delete: (id: string) => apiClient.delete(`/files/${id}`),

    list: (params?: {
      entity_type?: string;
      entity_id?: string;
      page?: number;
      limit?: number;
    }) => apiClient.get("/files", params),
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
    }) => apiClient.get("/inventory/logs", params),

    getByProduct: (
      productId: string,
      params?: {
        page?: number;
        limit?: number;
      },
    ) => apiClient.get(`/inventory/logs`, { product_id: productId, ...params }),

    getByBatch: (
      batchId: string,
      params?: {
        page?: number;
        limit?: number;
      },
    ) => apiClient.get(`/inventory/logs`, { batch_id: batchId, ...params }),

    export: (params?: {
      format?: "csv" | "pdf";
      start_date?: string;
      end_date?: string;
    }) => apiClient.get("/inventory/logs/export", params),
  },
};

// Utility functions
export const setAuthToken = (token: string) => {
  Cookies.set("auth_token", token, { expires: 7 }); // 7 days
  api.defaults.headers.Authorization = `Bearer ${token}`;
};

export const setRefreshToken = (token: string) => {
  Cookies.set("refresh_token", token, { expires: 30 }); // 30 days
};

export const getAuthToken = (): string | undefined => {
  return Cookies.get("auth_token");
};

export const getRefreshToken = (): string | undefined => {
  return Cookies.get("refresh_token");
};

export const clearTokens = () => {
  Cookies.remove("auth_token");
  Cookies.remove("refresh_token");
  // Clear axios default header
  if (api.defaults.headers.Authorization) {
    delete api.defaults.headers.Authorization;
  }
};

export default api;
