'use client';

import React, { ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

// Optional client-side guard wrapper component (complements middleware)
export function RouteGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const isAuthRoute = pathname?.startsWith('/auth') || pathname === '/';
    if (!isAuthenticated && !isAuthRoute) {
      router.replace(`/auth/login?next=${encodeURIComponent(pathname || '/')}`);
    }
    if (isAuthenticated && isAuthRoute) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return <>{children}</>;
}