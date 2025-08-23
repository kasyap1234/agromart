'use client';

import { useState } from 'react';
import { Package, AlertTriangle, DollarSign, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatsCard from '@/app/dashboard/_components/StatsCard';
import RecentActivity from '@/app/dashboard/_components/RecentActivity';
import LowStockItems from '@/app/dashboard/_components/LowStockItems';
import ExpiringBatches from '@/app/dashboard/_components/ExpiringBatches';
import QuickActions from './_components/QuickActions';
import { ErrorBoundaryWrapper } from '@/components/ui/error-boundary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardData } from '@/hooks/useDashboardData';

interface DashboardClientProps {
  initialData: {
    stats: any;
    lowStock: any[];
    expiring: any[];
    activity: any[];
    hasError: boolean;
  };
}

export default function DashboardClient({ initialData }: DashboardClientProps) {
  const [data, setData] = useState(initialData);

  const {
    stats,
    lowStock,
    expiring,
    activity,
    isLoading,
    hasError,
    refreshAll
  } = useDashboardData();

  // Use server-fetched data as initial state, then update with client-side data
  const currentStats = stats || data.stats;
  const currentLowStock = lowStock.length > 0 ? lowStock : data.lowStock;
  const currentExpiring = expiring.length > 0 ? expiring : data.expiring;
  const currentActivity = activity.length > 0 ? activity : data.activity;

  const handleRefresh = () => {
    refreshAll();
  };

  if (isLoading && !currentStats) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <ErrorBoundaryWrapper
      onRetry={handleRefresh}
      title="Dashboard Error"
      description="Failed to load dashboard data. Please try again."
    >
      {/* Refresh Button */}
      <div className="flex justify-end mb-6">
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          className="transition-all hover:scale-[1.02] hover:shadow-md bg-white/50 backdrop-blur-sm border-primary/30 hover:border-primary"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Products"
          value={currentStats?.total_products?.toLocaleString() || '0'}
          icon={Package}
          color="primary"
        />
        <StatsCard
          title="Low Stock Items"
          value={currentStats?.low_stock_count || 0}
          icon={AlertTriangle}
          color="warning"
        />
        <StatsCard
          title="Inventory Value"
          value={`₹${(currentStats?.total_value || 0).toLocaleString()}`}
          icon={DollarSign}
          color="success"
        />
        <StatsCard
          title="Expiring Batches"
          value={currentStats?.expiring_batches || 0}
          icon={Clock}
          color="error"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-8">
        <Card className="group transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 border-0 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                Low Stock Items
              </CardTitle>
              <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                {currentLowStock?.length || 0} items
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <LowStockItems lowStock={currentLowStock} />
          </CardContent>
        </Card>

        <Card className="group transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 border-0 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                Expiring Batches
              </CardTitle>
              <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                {currentExpiring?.length || 0} batches
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ExpiringBatches expiring={currentExpiring} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-8">
        <Card className="group transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 border-0 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Recent Activity
              </CardTitle>
              <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                {currentActivity?.length || 0} activities
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <RecentActivity recentActivity={currentActivity} />
          </CardContent>
        </Card>

        <Card className="group transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 border-0 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <QuickActions />
          </CardContent>
        </Card>
      </div>
    </ErrorBoundaryWrapper>
  );
}
