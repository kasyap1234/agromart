'use client';

import { Suspense, lazy, ComponentType } from 'react';

// Loading component for dynamic imports
interface LoadingFallbackProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

export function LoadingFallback({ size = 'md', message = 'Loading...' }: LoadingFallbackProps) {
  return (
    <div className="flex items-center justify-center p-4">
      <LoadingSpinner size={size} />
      <span className="ml-2 text-muted-foreground">{message}</span>
    </div>
  );
}

// Generic dynamic loader with error boundary
interface DynamicLoaderProps {
  component: () => Promise<{ default: ComponentType<any> }>;
  fallback?: React.ReactNode;
  loadingMessage?: string;
  errorFallback?: React.ReactNode;
}

export function DynamicLoader({
  component,
  fallback,
  loadingMessage,
  errorFallback
}: DynamicLoaderProps) {
  const LazyComponent = lazy(component);

  const defaultFallback = fallback || <LoadingFallback message={loadingMessage} />;

  return (
    <Suspense fallback={defaultFallback}>
      <LazyComponent />
    </Suspense>
  );
}

// Pre-configured loaders for common use cases
export const lazyLoad = (importFunc: () => Promise<{ default: ComponentType<any> }>) => {
  return lazy(importFunc);
};

// Dynamic page loader for route-based code splitting
export function DynamicPageLoader({
  page,
  fallback
}: {
  page: () => Promise<{ default: ComponentType<any> }>;
  fallback?: React.ReactNode;
}) {
  return (
    <DynamicLoader
      component={page}
      fallback={fallback || <PageSkeleton />}
      loadingMessage="Loading page..."
    />
  );
}

// Skeleton for page loading
function PageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-muted rounded w-2/3 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// LoadingSpinner component
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingSpinner({ size = 'md' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-primary border-t-transparent`}></div>
  );
}