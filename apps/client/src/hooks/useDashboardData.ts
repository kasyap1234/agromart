'use client';

import useSWR from 'swr';
import { apiClient } from '@/lib/api';
import type { DashboardStats, LowStockItem, ExpiringBatch } from '@/app/dashboard/types/types';
import type { InventoryLog } from '@/types';

export function useDashboardData() {
  // Dashboard stats
  const {
    data: dashboardStats,
    error: statsError,
    isLoading: statsLoading,
    mutate: refreshStats
  } = useSWR('/reports/dashboard-stats', apiClient.reports.dashboardStats, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
    errorRetryCount: 3,
    errorRetryInterval: 5000,
  });

  // Low stock items
  const {
    data: lowStockItems,
    error: lowStockError,
    isLoading: lowStockLoading,
    mutate: refreshLowStock
  } = useSWR('/reports/low-stock', () => apiClient.reports.lowStock(5), {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
    errorRetryCount: 3,
    errorRetryInterval: 5000,
  });

  // Expiring batches
  const {
    data: expiringBatches,
    error: expiringError,
    isLoading: expiringLoading,
    mutate: refreshExpiring
  } = useSWR('/reports/expiring-batches', () => apiClient.reports.expiringBatches(5), {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
    errorRetryCount: 3,
    errorRetryInterval: 5000,
  });

  // Recent activity
  const {
    data: recentActivity,
    error: recentActivityError,
    isLoading: recentActivityLoading,
    mutate: refreshActivity
  } = useSWR('/inventory/logs', () => apiClient.auditLogs.list({ limit: 5 }), {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
    errorRetryCount: 3,
    errorRetryInterval: 5000,
  });

  // Computed values
  const isLoading = statsLoading || lowStockLoading || expiringLoading || recentActivityLoading;
  const hasError = statsError || lowStockError || expiringError || recentActivityError;

  // Extract and normalize data
  const stats = (dashboardStats as { data?: DashboardStats })?.data || dashboardStats as DashboardStats;
  const lowStock = Array.isArray(lowStockItems) ? lowStockItems : (lowStockItems as { data?: LowStockItem[] })?.data || [] as LowStockItem[];
  const expiring = Array.isArray(expiringBatches) ? expiringBatches : (expiringBatches as { data?: ExpiringBatch[] })?.data || [] as ExpiringBatch[];
  const activity = Array.isArray(recentActivity) ? recentActivity : (recentActivity as { data?: InventoryLog[] })?.data || [] as InventoryLog[];

  // Refresh all data
  const refreshAll = () => {
    refreshStats();
    refreshLowStock();
    refreshExpiring();
    refreshActivity();
  };

  return {
    // Data
    stats,
    lowStock,
    expiring,
    activity,
    
    // Loading states
    isLoading,
    statsLoading,
    lowStockLoading,
    expiringLoading,
    recentActivityLoading,
    
    // Error states
    hasError,
    statsError,
    lowStockError,
    expiringError,
    recentActivityError,
    
    // Actions
    refreshAll,
    refreshStats,
    refreshLowStock,
    refreshExpiring,
    refreshActivity,
  };
}