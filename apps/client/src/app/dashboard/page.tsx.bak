'use client';

import React from 'react';
import useSWR from 'swr';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { apiClient } from '@/lib/api';
import { 
  CubeIcon, 
  ExclamationTriangleIcon, 
  CurrencyDollarIcon,
  ClockIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
  color?: 'primary' | 'warning' | 'error' | 'success';
}

function StatsCard({ title, value, icon: Icon, change, color = 'primary' }: StatsCardProps) {
  const colorClasses = {
    primary: 'bg-primary-500',
    warning: 'bg-warning-500',
    error: 'bg-error-500',
    success: 'bg-success-500',
  };

  return (
    <div className="card">
      <div className="card-body">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`w-12 h-12 rounded-lg ${colorClasses[color]} flex items-center justify-center`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="ml-4 flex-1">
            <p className="text-sm font-medium text-neutral-500">{title}</p>
            <p className="text-2xl font-bold text-neutral-900">{value}</p>
            {change && (
              <div className="flex items-center mt-1">
                {change.type === 'increase' ? (
                  <ArrowUpIcon className="w-4 h-4 text-success-500" />
                ) : (
                  <ArrowDownIcon className="w-4 h-4 text-error-500" />
                )}
                <span
                  className={`text-sm font-medium ml-1 ${
                    change.type === 'increase' ? 'text-success-600' : 'text-error-600'
                  }`}
                >
                  {Math.abs(change.value)}%
                </span>
                <span className="text-sm text-neutral-500 ml-1">vs last month</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-neutral-200 rounded-lg skeleton"></div>
                </div>
                <div className="ml-4 flex-1">
                  <div className="h-4 bg-neutral-200 rounded skeleton mb-2"></div>
                  <div className="h-8 bg-neutral-200 rounded skeleton"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <div className="h-6 bg-neutral-200 rounded skeleton w-32"></div>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="h-4 bg-neutral-200 rounded skeleton w-32"></div>
                  <div className="h-4 bg-neutral-200 rounded skeleton w-16"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="card-header">
            <div className="h-6 bg-neutral-200 rounded skeleton w-32"></div>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="h-4 bg-neutral-200 rounded skeleton w-32"></div>
                  <div className="h-4 bg-neutral-200 rounded skeleton w-20"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface DashboardStats {
  total_products: number;
  low_stock_count: number;
  total_value: number;
  expiring_batches: number;
  // Add other properties as needed
}

interface LowStockItem {
  product_name: string;
  product_sku: string;
  current_quantity: number;
  min_stock_level: number;
}

interface ExpiringBatch {
  product_name: string;
  batch_number: string;
  days_until_expiry: number;
  quantity: number;
}

export default function DashboardPage() {
  const { data: dashboardStats, error: statsError, isLoading: statsLoading } = useSWR(
    '/reports/dashboard-stats',
    () => apiClient.reports.dashboardStats()
  );

  const { data: lowStockItems, error: lowStockError, isLoading: lowStockLoading } = useSWR(
    '/reports/low-stock',
    () => apiClient.reports.lowStock(10)
  );

  const { data: expiringBatches, error: expiringError, isLoading: expiringLoading } = useSWR(
    '/reports/expiring-batches',
    () => apiClient.reports.expiringBatches(30)
  );

  if (statsLoading || lowStockLoading || expiringLoading) {
    return (
      <DashboardLayout title="Dashboard">
        <LoadingSkeleton />
      </DashboardLayout>
    );
  }

  if (statsError || lowStockError || expiringError) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="w-12 h-12 text-error-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 mb-2">Error loading dashboard</h3>
          <p className="text-neutral-500">
            There was an error loading your dashboard data. Please try refreshing the page.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const stats = (dashboardStats as DashboardStats) || {};
  const lowStock = (lowStockItems as LowStockItem[]) || [];
  const expiring = (expiringBatches as ExpiringBatch[]) || [];

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Products"
            value={stats.total_products || 0}
            icon={CubeIcon}
            color="primary"
            change={{ value: 12, type: 'increase' }}
          />
          <StatsCard
            title="Low Stock Items"
            value={stats.low_stock_count || 0}
            icon={ExclamationTriangleIcon}
            color="warning"
          />
          <StatsCard
            title="Inventory Value"
            value={`$${(stats.total_value || 0).toLocaleString()}`}
            icon={CurrencyDollarIcon}
            color="success"
            change={{ value: 8, type: 'increase' }}
          />
          <StatsCard
            title="Expiring Batches"
            value={stats.expiring_batches || 0}
            icon={ClockIcon}
            color="error"
          />
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Low Stock Items */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-neutral-900">Low Stock Items</h3>
            </div>
            <div className="card-body">
              {lowStock.length > 0 ? (
                <div className="space-y-4">
                  {lowStock.slice(0, 5).map((item: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-neutral-900">{item.product_name}</p>
                        <p className="text-xs text-neutral-500">SKU: {item.product_sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-error-600">
                          {item.current_quantity} units
                        </p>
                        <p className="text-xs text-neutral-500">
                          Min: {item.min_stock_level}
                        </p>
                      </div>
                    </div>
                  ))}
                  {lowStock.length > 5 && (
                    <div className="text-center pt-4 border-t border-neutral-200">
                      <a
                        href="/reports/low-stock"
                        className="text-sm font-medium text-primary-600 hover:text-primary-500"
                      >
                        View all {lowStock.length} items
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <CubeIcon className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                  <p className="text-sm text-neutral-500">No low stock items</p>
                </div>
              )}
            </div>
          </div>

          {/* Expiring Batches */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-neutral-900">Expiring Batches (30 days)</h3>
            </div>
            <div className="card-body">
              {expiring.length > 0 ? (
                <div className="space-y-4">
                  {expiring.slice(0, 5).map((batch: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-neutral-900">{batch.product_name}</p>
                        <p className="text-xs text-neutral-500">Batch: {batch.batch_number}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-warning-600">
                          {batch.days_until_expiry} days
                        </p>
                        <p className="text-xs text-neutral-500">
                          {batch.quantity} units
                        </p>
                      </div>
                    </div>
                  ))}
                  {expiring.length > 5 && (
                    <div className="text-center pt-4 border-t border-neutral-200">
                      <a
                        href="/reports/expiring-batches"
                        className="text-sm font-medium text-primary-600 hover:text-primary-500"
                      >
                        View all {expiring.length} batches
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <ClockIcon className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                  <p className="text-sm text-neutral-500">No expiring batches</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-neutral-900">Quick Actions</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a
                href="/products/new"
                className="flex items-center p-4 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors duration-200"
              >
                <CubeIcon className="w-8 h-8 text-primary-600 mr-3" />
                <div>
                  <p className="font-medium text-primary-900">Add Product</p>
                  <p className="text-sm text-primary-600">Create a new product</p>
                </div>
              </a>
              
              <a
                href="/inventory/add"
                className="flex items-center p-4 bg-success-50 rounded-lg hover:bg-success-100 transition-colors duration-200"
              >
                <ArrowUpIcon className="w-8 h-8 text-success-600 mr-3" />
                <div>
                  <p className="font-medium text-success-900">Add Inventory</p>
                  <p className="text-sm text-success-600">Increase stock levels</p>
                </div>
              </a>
              
              <a
                href="/reports"
                className="flex items-center p-4 bg-warning-50 rounded-lg hover:bg-warning-100 transition-colors duration-200"
              >
                <ExclamationTriangleIcon className="w-8 h-8 text-warning-600 mr-3" />
                <div>
                  <p className="font-medium text-warning-900">View Reports</p>
                  <p className="text-sm text-warning-600">Analyze inventory data</p>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
