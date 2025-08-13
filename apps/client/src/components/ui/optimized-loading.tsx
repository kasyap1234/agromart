import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface OptimizedLoadingProps {
  variant?: 'stats' | 'table' | 'list' | 'card' | 'dashboard';
  count?: number;
  className?: string;
}

export function OptimizedLoading({ 
  variant = 'card', 
  count = 1, 
  className = '' 
}: OptimizedLoadingProps) {
  const renderStatsLoading = () => (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Skeleton className="h-8 w-8 rounded" />
              <div className="ml-4 space-y-2 flex-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-16" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderTableLoading = () => (
    <div className={`space-y-3 ${className}`}>
      {[...Array(count)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4 animate-pulse">
          <Skeleton className="h-12 w-12 rounded" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
          <Skeleton className="h-8 w-[100px]" />
        </div>
      ))}
    </div>
  );

  const renderListLoading = () => (
    <div className={`space-y-4 ${className}`}>
      {[...Array(count)].map((_, i) => (
        <div key={i} className="flex items-start gap-3 animate-pulse">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-3 w-[150px]" />
          </div>
        </div>
      ))}
    </div>
  );

  const renderCardLoading = () => (
    <Card className={`animate-pulse ${className}`}>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[...Array(count)].map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderDashboardLoading = () => (
    <div className={`space-y-6 ${className}`}>
      {renderStatsLoading()}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderCardLoading()}
        {renderCardLoading()}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderCardLoading()}
        {renderCardLoading()}
      </div>
    </div>
  );

  switch (variant) {
    case 'stats':
      return renderStatsLoading();
    case 'table':
      return renderTableLoading();
    case 'list':
      return renderListLoading();
    case 'dashboard':
      return renderDashboardLoading();
    default:
      return renderCardLoading();
  }
}

export default OptimizedLoading;