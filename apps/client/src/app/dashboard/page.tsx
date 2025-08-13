"use client";

import React from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Package,
  AlertTriangle,
  DollarSign,
  Clock
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { formatDate } from "@/lib/date";
import StatsCard from "@/dashboard/_components/StatsCard";
import LoadingSkeleton from "@/dashboard/_components/LoadingSkeleton";
import { 
  StatsCardProps, 
  DashboardStats,
  LowStockItem,
  ExpiringBatch,
} from "@/app/dashboard/types/types";
import type { recentActivity } from "@/app/dashboard/types/types";
import { cn } from "@/lib/utils";
import RecentActivity from "@/dashboard/_components/RecentActivity";
import LowStockItems from "@/dashboard/_components/LowStockItems";
import ExpiringBatches from "@/dashboard/_components/ExpiringBatches";
import QuickActions from "./_components/QuickActions";

export default function DashboardPage() {
  const router = useRouter();

  // Fetch dashboard stats with optimized caching
  const {
    data: dashboardStats,
    error: statsError,
    isLoading: statsLoading,
  } = useSWR(
    "/reports/dashboard-stats",
    () => apiClient.reports.dashboardStats(),
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      dedupingInterval: 30000, // 30 seconds
    },
  );

  // Fetch low stock items with limit
  const {
    data: lowStockItems,
    error: lowStockError,
    isLoading: lowStockLoading,
  } = useSWR(
    "/reports/low-stock",
    () => apiClient.reports.lowStock(5), // Limit to 5 items
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      dedupingInterval: 60000, // 1 minute
    },
  );

  // Fetch expiring batches with limit
  const {
    data: expiringBatches,
    error: expiringError,
    isLoading: expiringLoading,
  } = useSWR(
    "/reports/expiring-batches",
    () => apiClient.reports.expiringBatches(5), // Limit to 5 items
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      dedupingInterval: 60000, // 1 minute
    },
  );

  // Mock recent activity data (in a real app, this would come from an API)
  const recentAct: recentActivity[] = [
    {
      id: "1",
      type: "product_added",
      description: 'Added new product "Organic Rice"',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: "2",
      type: "inventory_updated",
      description: 'Updated inventory for "Wheat Flour"',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: "3",
      type: "order_created",
      description: "Created purchase order #PO-78945",
      timestamp: new Date(Date.now() - 10800000).toISOString(),
    },
    {
      id: "4",
      type: "product_added",
      description: 'Added new product "Fresh Vegetables"',
      timestamp: new Date(Date.now() - 14400000).toISOString(),
    },
    {
      id: "5",
      type: "inventory_updated",
      description: 'Reduced stock for "Spices Mix"',
      timestamp: new Date(Date.now() - 18000000).toISOString(),
    },
  ];

  if (statsLoading || lowStockLoading || expiringLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to your AgroMart dashboard
          </p>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  // Only treat lowStock errors as blocking; the others are optional
  if (lowStockError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to your AgroMart dashboard
          </p>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              Error loading dashboard
            </h3>
            <p className="text-muted-foreground">
              There was an error loading your dashboard data. Please try
              refreshing the page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = (dashboardStats as DashboardStats) || {
    total_products: 0,
    low_stock_count: 0,
    total_value: 0,
    expiring_batches: 0,
  };
  const lowStock = (lowStockItems as LowStockItem[]) || [];
  const expiring = (expiringBatches as ExpiringBatch[]) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome to your AgroMart dashboard
        </h1>
      </div>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Products"
          value={stats.total_products || 0}
          icon={Package}
          color="primary"
        />
        <StatsCard
          title="Low Stock Items"
          value={stats.low_stock_count || 0}
          icon={AlertTriangle}
          color="warning"
        />
        <StatsCard
          title="Inventory Value"
          value={`₹${(stats.total_value || 0).toLocaleString()}`}
          icon={DollarSign}
          color="success"
        />
        <StatsCard
          title="Expiring Batches"
          value={stats.expiring_batches || 0}
          icon={Clock}
          color="error"
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Items */}
        <LowStockItems lowStock={lowStock}/>
        {/* Expiring Batches */}
        <ExpiringBatches expiring={expiring} />
      </div>
      {/* Recent Activity and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <RecentActivity recentActivity={recentAct} />
        {/* Quick Actions */}
        <QuickActions/>
      </div>
    </div>
  );
}
