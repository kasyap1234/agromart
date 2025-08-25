'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { apiClient, setAuthToken, getAuthToken, clearTokens, setRefreshToken, getRefreshToken } from '@/lib/api';
import { User, LoginRequest, RegisterRequest, AuthResponse } from '@/types';

interface AuthContextType {
   isAuthenticated: boolean;
   user: User | null;
   login: (data: LoginRequest, remember?: boolean) => Promise<void>;
   logout: () => void;
   register: (data: RegisterRequest) => Promise<void>;
   refreshAuth: () => Promise<void>;
   updateUser: (userData: Partial<User>) => void;
   isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auto-refresh token every 45 minutes (tokens typically expire after 1 hour)
const TOKEN_REFRESH_INTERVAL = 45 * 60 * 1000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Refresh authentication token
  const refreshAuth = useCallback(async () => {
    const refreshToken = getRefreshToken();
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await apiClient.auth.refreshToken(refreshToken);
      
      if (response.success && response.data) {
        const { token, refresh_token, user } = response.data;
        
        // Update tokens
        setAuthToken(token);
        if (refresh_token) {
          setRefreshToken(refresh_token);
        }
        
        // Update user state
        setUser(user);
        
        return response;
      } else {
        throw new Error('Failed to refresh token');
      }
    } catch (error) {
      console.error('Error refreshing auth:', error);
      throw error;
    }
  }, []);

  // Check if we have valid auth and load user data
  const loadUserFromToken = useCallback(async () => {
    const token = getAuthToken();
    
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      setAuthToken(token);
      const data = await apiClient.auth.me();
      
      if (data.success && data.data) {
        setUser(data.data);
      } else {
        throw new Error('Invalid user data');
      }
    } catch (error) {
      console.error('Error loading user from token:', error);
      
      // Token might be expired, try to refresh
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        try {
          await refreshAuth();
          return;
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
        }
      }
      
      // Clear invalid tokens
      clearTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [refreshAuth]);


  // Initialize auth state on mount
  useEffect(() => {
    loadUserFromToken();
  }, [loadUserFromToken]);

  const login = async (data: LoginRequest, remember = false) => {
    try {
      setIsLoading(true);
      const response = await apiClient.auth.login(data.email, data.password);
      
      if (response.success && response.data) {
        const { token, refresh_token, user } = response.data;
        
        // Store tokens
        setAuthToken(token);
        if (remember && refresh_token) {
          setRefreshToken(refresh_token);
        }
        
        setUser(user);
        toast.success('Login successful!');
        router.push('/dashboard');
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: any) {
      const message = error?.message || 'Login failed. Please try again.';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      setIsLoading(true);
      const response = await apiClient.auth.register(data);
      
      if (response.success && response.data) {
        const { token, refresh_token, user } = response.data;
        
        // Store tokens for immediate login after registration
        setAuthToken(token);
        if (refresh_token) {
          setRefreshToken(refresh_token);
        }
        
        setUser(user);
        toast.success('Registration successful!');
        router.push('/dashboard');
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error: any) {
      const message = error?.message || 'Registration failed. Please try again.';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Call logout endpoint
      await apiClient.auth.logout();
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      // Clear tokens and state regardless of API call success
      clearTokens();
      setUser(null);
      toast.success('Logged out successfully');
      router.push('/auth/login');
    }
  };

  // Update user data
  const updateUser = useCallback((userData: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...userData } : null);
  }, []);

  // Set up automatic token refresh
  useEffect(() => {
    if (!user) return;

    const refreshInterval = setInterval(async () => {
      try {
        await refreshAuth();
      } catch (error) {
        console.error('Auto refresh failed:', error);
        // If auto-refresh fails, logout user
        logout();
      }
    }, TOKEN_REFRESH_INTERVAL);

    return () => clearInterval(refreshInterval);
  }, [user, refreshAuth]);

  // Handle visibility change - refresh auth when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        // Check if we need to refresh auth when user returns to tab
        loadUserFromToken();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, loadUserFromToken]);

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated: !!user, 
      user, 
      login, 
      logout, 
      register, 
      refreshAuth,
      updateUser,
      isLoading 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Enhanced permissions hook with comprehensive role-based access control
export const usePermissions = () => {
  const { user } = useAuth();
  const role = user?.role?.toLowerCase();

  // Admin permissions - full system access
  const isAdmin = role === 'admin';
  const isManager = role === 'manager';
  const isUser = role === 'user';

  // Core module permissions
  const canManageUsers = isAdmin;
  const canViewUsers = isAdmin || isManager;
  const canEditOwnProfile = true; // All users can edit their own profile
  
  const canManageProducts = isAdmin || isManager;
  const canViewProducts = true; // All authenticated users can view products
  const canCreateProducts = isAdmin || isManager;
  const canEditProducts = isAdmin || isManager;
  const canDeleteProducts = isAdmin;
  
  const canManageInventory = isAdmin || isManager;
  const canViewInventory = true; // All users can view inventory
  const canUpdateInventory = isAdmin || isManager;
  const canCreateBatches = isAdmin || isManager;
  const canManageBatches = isAdmin || isManager;
  
  const canManageCustomers = isAdmin || isManager;
  const canViewCustomers = true;
  const canCreateCustomers = isAdmin || isManager;
  const canEditCustomers = isAdmin || isManager;
  const canDeleteCustomers = isAdmin;
  
  const canManageSuppliers = isAdmin || isManager;
  const canViewSuppliers = true;
  const canCreateSuppliers = isAdmin || isManager;
  const canEditSuppliers = isAdmin || isManager;
  const canDeleteSuppliers = isAdmin;
  
  const canManageLocations = isAdmin || isManager;
  const canViewLocations = true;
  const canCreateLocations = isAdmin || isManager;
  const canEditLocations = isAdmin || isManager;
  const canDeleteLocations = isAdmin;
  
  // Orders permissions
  const canManagePurchaseOrders = isAdmin || isManager;
  const canViewPurchaseOrders = true;
  const canCreatePurchaseOrders = isAdmin || isManager;
  const canEditPurchaseOrders = isAdmin || isManager;
  const canApprovePurchaseOrders = isAdmin || isManager;
  const canDeletePurchaseOrders = isAdmin;
  
  const canManageSalesOrders = isAdmin || isManager;
  const canViewSalesOrders = true;
  const canCreateSalesOrders = isAdmin || isManager;
  const canEditSalesOrders = isAdmin || isManager;
  const canProcessSalesOrders = isAdmin || isManager;
  const canDeleteSalesOrders = isAdmin;
  
  // Reports and analytics permissions
  const canViewReports = isAdmin || isManager;
  const canViewAdvancedReports = isAdmin;
  const canExportReports = isAdmin || isManager;
  const canViewAnalytics = isAdmin || isManager;
  const canViewFinancialReports = isAdmin;
  
  // Settings permissions
  const canManageSettings = isAdmin;
  const canViewSettings = isAdmin || isManager;
  const canManageTenantSettings = isAdmin;
  const canManageSystemSettings = isAdmin;
  
  // File upload permissions
  const canUploadFiles = isAdmin || isManager;
  const canDeleteFiles = isAdmin;
  
  // Low stock alerts
  const canViewLowStockAlerts = true;
  const canManageLowStockAlerts = isAdmin || isManager;
  
  return {
    // User role checks
    isAdmin,
    isManager,
    isUser,
    role,
    
    // Legacy permissions (for backward compatibility)
    canManageUsers,
    canManageProducts,
    canManageInventory,
    canViewReports,
    
    // User management
    canViewUsers,
    canEditOwnProfile,
    
    // Product management
    canViewProducts,
    canCreateProducts,
    canEditProducts,
    canDeleteProducts,
    
    // Inventory management
    canViewInventory,
    canUpdateInventory,
    canCreateBatches,
    canManageBatches,
    
    // Customer management
    canManageCustomers,
    canViewCustomers,
    canCreateCustomers,
    canEditCustomers,
    canDeleteCustomers,
    
    // Supplier management
    canManageSuppliers,
    canViewSuppliers,
    canCreateSuppliers,
    canEditSuppliers,
    canDeleteSuppliers,
    
    // Location management
    canManageLocations,
    canViewLocations,
    canCreateLocations,
    canEditLocations,
    canDeleteLocations,
    
    // Purchase order management
    canManagePurchaseOrders,
    canViewPurchaseOrders,
    canCreatePurchaseOrders,
    canEditPurchaseOrders,
    canApprovePurchaseOrders,
    canDeletePurchaseOrders,
    
    // Sales order management
    canManageSalesOrders,
    canViewSalesOrders,
    canCreateSalesOrders,
    canEditSalesOrders,
    canProcessSalesOrders,
    canDeleteSalesOrders,
    
    // Reports and analytics
    canViewAdvancedReports,
    canExportReports,
    canViewAnalytics,
    canViewFinancialReports,
    
    // Settings
    canManageSettings,
    canViewSettings,
    canManageTenantSettings,
    canManageSystemSettings,
    
    // File management
    canUploadFiles,
    canDeleteFiles,
    
    // Alerts
    canViewLowStockAlerts,
    canManageLowStockAlerts,
  };
};