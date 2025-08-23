import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'default' | 'circle' | 'rounded';
  animate?: boolean;
}

export function Skeleton({
  className,
  variant = 'default',
  animate = true,
}: SkeletonProps) {
  const baseClasses = 'bg-gray-200 dark:bg-gray-700';

  const variantClasses = {
    default: 'rounded',
    circle: 'rounded-full',
    rounded: 'rounded-lg',
  };

  const animationClasses = animate
    ? 'animate-pulse'
    : '';

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        animationClasses,
        className
      )}
    />
  );
}

// Specific skeleton components for different use cases
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-4',
            i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'
          )}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('p-4 border rounded-lg space-y-3', className)}>
      <Skeleton className="h-4 w-3/4" />
      <SkeletonText lines={2} />
      <div className="flex space-x-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-16" />
      </div>
    </div>
  );
}

export function SkeletonAvatar({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  return (
    <Skeleton
      variant="circle"
      className={cn(sizeClasses[size], className)}
    />
  );
}

export function SkeletonTable({
  rows = 5,
  columns = 4,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex space-x-4 pb-2 border-b">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              className={cn(
                'h-4 flex-1',
                colIndex === 0 ? 'w-1/2' : 'w-full'
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonProductCard({ className }: { className?: string }) {
  return (
    <div className={cn('border rounded-lg p-4 space-y-3', className)}>
      <Skeleton className="w-full aspect-square rounded" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}

// Progressive loading wrapper component
interface ProgressiveLoaderProps {
  isLoading: boolean;
  skeleton: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function ProgressiveLoader({
  isLoading,
  skeleton,
  children,
  className,
}: ProgressiveLoaderProps) {
  return (
    <div className={className}>
      {isLoading ? skeleton : children}
    </div>
  );
}

// Staggered animation for multiple skeleton items
export function StaggeredSkeleton({
  count = 3,
  skeleton: SkeletonComponent,
  className,
  staggerDelay = 100,
}: {
  count?: number;
  skeleton: React.ComponentType<{ className?: string }>;
  className?: string;
  staggerDelay?: number;
}) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            animationDelay: `${i * staggerDelay}ms`,
          }}
        >
          <SkeletonComponent />
        </div>
      ))}
    </div>
  );
}