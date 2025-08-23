'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, setAuthToken, getAuthToken, clearTokens, setRefreshToken } from '@/lib/api';
import { User, LoginRequest, RegisterRequest, AuthResponse } from '@/types';

interface AuthContextType {
   isAuthenticated: boolean;
   user: User | null;
   login: (data: LoginRequest, remember?: boolean) => Promise<void>;
   logout: () => void;
   register: (data: RegisterRequest) => Promise<void>;
   isLoading: boolean;
 }

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const token = getAuthToken();
      if (token) {
        setAuthToken(token);
        try {
          const data = await apiClient.auth.me();
          if (data.success && data.data) {
            setUser(data.data);
          } else {
            clearTokens();
            setAuthToken('');
          }
        } catch (error) {
          clearTokens();
          setAuthToken('');
        }
      }
      setIsLoading(false);
    };
    checkUser();
  }, []);

  const login = async (data: LoginRequest, remember = false) => {
    const response = await apiClient.auth.login(data.email, data.password);
    const { token, user } = response.data;
    if (remember) {
      setRefreshToken(response.data.refresh_token);
    }
    setAuthToken(token);
    setUser(user);
    router.push('/dashboard');
  };

  const register = async (data: RegisterRequest) => {
    await apiClient.auth.register(data);
    router.push('/auth/login?registered=true');
  };

  const logout = () => {
    clearTokens();
    setAuthToken('');
    setUser(null);
    router.push('/auth/login');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, login, logout, register, isLoading }}>
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

export const usePermissions = () => {
  const { user } = useAuth();
  const role = user?.role;

  const canManageUsers = role === 'ADMIN';
  const canManageProducts = ['ADMIN', 'MANAGER'].includes(role || '');
  const canManageInventory = ['ADMIN', 'MANAGER', 'STAFF'].includes(role || '');
  const canViewReports = ['ADMIN', 'MANAGER'].includes(role || '');

  return { canManageUsers, canManageProducts, canManageInventory, canViewReports };
};