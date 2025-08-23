'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from './card';
import { Skeleton } from './skeleton';
import { Alert, AlertDescription } from './alert';
import { Loader2, Wifi, RefreshCw } from 'lucide-react';
import { Button } from './button';

interface LoadingFallbackProps {
  type?: 'skeleton' | 'spinner' | 'pulse' | 'shimmer';
  message?: string;
  showRetry?: boolean;
  onRetry?: () => void;
  className?: string;
}

// Basic spinner loader
export const LoadingSpinner: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}> = ({ size = 'md', message = 'Loading...', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-2 ${className}`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin text-primary`} />
      {message && (
        <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
      )}
    </div>
  );
};

// Pulse loader for cards
export const PulseLoader: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse ${className}`}>
    <div className="space-y-4">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>
    </div>
  </div>
);

// Shimmer effect loader
export const ShimmerLoader: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`relative overflow-hidden bg-gray-200 rounded ${className}`}>
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-shimmer"></div>
  </div>
);

// Skeleton card loader
export const SkeletonCard: React.FC<{
  rows?: number;
  showAvatar?: boolean;
  className?: string;
}> = ({ rows = 3, showAvatar = false, className = '' }) => (
  <Card className={className}>
    <CardHeader>
      <div className="flex items-center space-x-4">
        {showAvatar && <Skeleton className="w-12 h-12 rounded-full" />}
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    </CardContent>
  </Card>
);

// Dashboard skeleton loader
export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Header skeleton */}
    <div className="flex justify-between items-center">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-10 w-24" />
    </div>

    {/* Stats cards skeleton */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
              </div>
              <Skeleton className="w-8 h-8 rounded" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Main content skeleton */}
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
      <SkeletonCard rows={4} className="h-96" />
      <SkeletonCard rows={4} className="h-96" />
    </div>
  </div>
);

// Products list skeleton
export const ProductsSkeleton: React.FC = () => (
  <div className="space-y-4">
    {/* Header */}
    <div className="flex justify-between items-center">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-10 w-24" />
    </div>

    {/* Search and filters */}
    <div className="flex space-x-4">
      <Skeleton className="h-10 flex-1" />
      <Skeleton className="h-10 w-32" />
    </div>

    {/* Product cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="w-full h-48 rounded" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

// Form skeleton loader
export const FormSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-10 w-full" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-32 w-full" />
    </div>
    <div className="flex space-x-4">
      <Skeleton className="h-10 flex-1" />
      <Skeleton className="h-10 flex-1" />
    </div>
  </div>
);

// Main loading fallback component
export const LoadingFallback: React.FC<LoadingFallbackProps> = ({
  type = 'skeleton',
  message = 'Loading...',
  showRetry = false,
  onRetry,
  className = '',
}) => {
  const renderLoader = () => {
    switch (type) {
      case 'spinner':
        return <LoadingSpinner message={message} />;
      case 'pulse':
        return <PulseLoader />;
      case 'shimmer':
        return <ShimmerLoader />;
      case 'skeleton':
      default:
        return <DashboardSkeleton />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className={`w-full ${className}`}
    >
      {renderLoader()}
      {showRetry && onRetry && (
        <div className="flex justify-center mt-6">
          <Button onClick={onRetry} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      )}
    </motion.div>
  );
};

// Network error fallback
export const NetworkErrorFallback: React.FC<{
  onRetry?: () => void;
  message?: string;
}> = ({ onRetry, message = 'Unable to connect. Please check your internet connection.' }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.2 }}
    className="min-h-[400px] flex items-center justify-center p-4"
  >
    <Card className="w-full max-w-md">
      <CardContent className="pt-6">
        <div className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <Wifi className="w-6 h-6 text-red-600" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Connection Error</h3>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
          {onRetry && (
            <Button onClick={onRetry} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

// Offline fallback component
export const OfflineFallback: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100"
  >
    <Card className="w-full max-w-lg">
      <CardContent className="pt-6">
        <div className="text-center space-y-6">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center"
          >
            <Wifi className="w-8 h-8 text-yellow-600" />
          </motion.div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">You're Offline</h2>
            <p className="text-gray-600">
              Don't worry! Your work is saved locally. We'll automatically sync when you're back online.
            </p>
          </div>

          <Alert>
            <AlertDescription>
              Some features may be limited while offline. Please check your connection and try again.
            </AlertDescription>
          </Alert>

          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="w-full"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Page
          </Button>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

// Animation variants for staggered loading
export const loadingVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      staggerChildren: 0.1,
    },
  },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};