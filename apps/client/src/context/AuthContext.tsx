'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { apiClient, setAuthToken, setRefreshToken, clearTokens, getAuthToken } from '@/lib/api';
import { User, AuthResponse, RegisterRequest, AuthContextType } from '@/types';
import { MeResponse } from '@/types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const isAuthenticated = !!user && !!token;

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = getAuthToken();
      
      if (storedToken) {
        setToken(storedToken);
        try {
          // Verify token and get user info
          const response = await apiClient.auth.me();
          if (response.success) {
            setUser(response.data);
          } else {
            // Token is invalid, clear it
            clearTokens();
            setToken(null);
          }
        } catch (error) {
          // Token is invalid or expired
          clearTokens();
          setToken(null);
        }
      }
      
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      const response: AuthResponse = await apiClient.auth.login(email, password);
      
      if (response.success) {
        const { user: userData, token: authToken, refresh_token } = response.data;
        
        // Store tokens
        setAuthToken(authToken);
        setRefreshToken(refresh_token);
        
        // Update state
        setUser(userData);
        setToken(authToken);
        
        toast.success('Login successful!');
        router.push('/dashboard');
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Login failed';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterRequest): Promise<void> => {
    try {
      setIsLoading(true);
      const response: AuthResponse = await apiClient.auth.register(data);
      
      if (response.success) {
        const { user: userData, token: authToken, refresh_token } = response.data;
        
        // Store tokens
        setAuthToken(authToken);
        setRefreshToken(refresh_token);
        
        // Update state
        setUser(userData);
        setToken(authToken);
        
        toast.success('Registration successful!');
        router.push('/dashboard');
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Registration failed';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Call logout endpoint to invalidate token on server
      await apiClient.auth.logout();
    } catch (error) {
      // Continue with logout even if server call fails
      console.error('Logout error:', error);
    } finally {
      // Clear local state and tokens
      clearTokens();
      setUser(null);
      setToken(null);
      
      toast.success('Logged out successfully');
      router.push('/auth/login');
    }
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    isLoading,
    isAuthenticated,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Higher-order component for protecting routes
export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        router.push('/auth/login');
      }
    }, [isAuthenticated, isLoading, router]);

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
}

// Hook for role-based access control
export function usePermissions() {
  const { user } = useAuth();

  const hasRole = (role: string): boolean => {
    return user?.role === role;
  };

  const hasAnyRole = (roles: string[]): boolean => {
    return roles.includes(user?.role || '');
  };

  const isAdmin = (): boolean => {
    return hasRole('admin');
  };

  const isManager = (): boolean => {
    return hasRole('manager');
  };

  const isUser = (): boolean => {
    return hasRole('user');
  };

  const canManageProducts = (): boolean => {
    return hasAnyRole(['admin', 'manager']);
  };

  const canManageInventory = (): boolean => {
    return hasAnyRole(['admin', 'manager', 'user']);
  };

  const canViewReports = (): boolean => {
    return hasAnyRole(['admin', 'manager']);
  };

  const canManageUsers = (): boolean => {
    return hasRole('admin');
  };

  return {
    user,
    hasRole,
    hasAnyRole,
    isAdmin,
    isManager,
    isUser,
    canManageProducts,
    canManageInventory,
    canViewReports,
    canManageUsers,
  };
}
