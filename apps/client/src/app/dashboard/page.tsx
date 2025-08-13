"use client";

import React from "react";
import { Package, AlertTriangle, DollarSign, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatsCard from "@/app/dashboard/_components/StatsCard";
import LoadingSkeleton from "@/app/dashboard/_components/LoadingSkeleton";
import RecentActivity from "@/app/dashboard/_components/RecentActivity";
import LowStockItems from "@/app/dashboard/_components/LowStockItems";
import ExpiringBatches from "@/app/dashboard/_components/ExpiringBatches";
import QuickActions from "./_components/QuickActions";
import { ErrorBoundaryWrapper } from "@/components/ui/error-boundary";
import { ResponsiveContainer } from "@/components/ui/responsive-container";
import { useDashboardData } from "@/hooks/useDashboardData";
import { withAuth } from "@/context/AuthContext";

export default withAuth(function DashboardPage() {
  const {
    stats,
    lowStock,
    expiring,
    activity,
    isLoading,
    hasError,
    refreshAll
  } = useDashboardData();

  if (isLoading) {
    return (
      <ResponsiveContainer variant="padded">
        <div className="space-y-6">
          <PageTitle />
          <LoadingSkeleton />
        </div>
      </ResponsiveContainer>
    );
  }

  return (
    <ErrorBoundaryWrapper 
      onRetry={refreshAll}
      title="Dashboard Error"
      description="Failed to load dashboard data. Please try again."
    >
      <ResponsiveContainer variant="padded">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <PageTitle />
            <Button onClick={refreshAll} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Data
            </Button>
          </div>

          {/* Stats Grid - Responsive */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            <StatsCard
              title="Total Products"
              value={stats?.total_products?.toLocaleString() || '0'}
              icon={Package}
              color="primary"
            />
            <StatsCard
              title="Low Stock Items"
              value={stats?.low_stock_count || 0}
              icon={AlertTriangle}
              color="warning"
            />
            <StatsCard
              title="Inventory Value"
              value={`₹${(stats?.total_value || 0).toLocaleString()}`}
              icon={DollarSign}
              color="success"
            />
            <StatsCard
              title="Expiring Batches"
              value={stats?.expiring_batches || 0}
              icon={Clock}
              color="error"
            />
          </div>

          {/* Main Content Grid - Responsive */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
            <LowStockItems lowStock={lowStock} />
            <ExpiringBatches expiring={expiring} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
            <RecentActivity recentActivity={activity} />
            <QuickActions />
          </div>
        </div>
      </ResponsiveContainer>
    </ErrorBoundaryWrapper>
  );
});

function PageTitle() {
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
        Welcome to your AgroMart dashboard
      </h1>
      <p className="text-muted-foreground mt-1 text-sm sm:text-base">
        Monitor your inventory and business metrics in real-time
      </p>
    </div>
  );
}