'use client';

import React from 'react';
import useSWR from 'swr';
import { apiClient } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard, ProgressCard, SimpleBarChart, StatusIndicator } from '@/components/ui/data-visualization';
import { AdvancedTable, Column } from '@/components/ui/advanced-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { OptimizedLoading } from '@/components/ui/optimized-loading';
import { ErrorBoundaryWrapper } from '@/components/ui/error-boundary';
import { 
  TrendingUp, 
  Package, 
  DollarSign, 
  Users, 
  ShoppingCart,
  AlertTriangle,
  BarChart3,
  PieChart,
  RefreshCw
} from 'lucide-react';

interface AnalyticsData {
  revenue: {
    total: number;
    change: number;
    trend: 'up' | 'down' | 'neutral';
  };
  orders: {
    total: number;
    change: number;
    trend: 'up' | 'down' | 'neutral';
  };
  customers: {
    total: number;
    change: number;
    trend: 'up' | 'down' | 'neutral';
  };
  inventory: {
    total: number;
    lowStock: number;
    outOfStock: number;
  };
  topProducts: Array<{
    id: string;
    name: string;
    sales: number;
    revenue: number;
    category: string;
  }>;
  salesByCategory: Array<{
    label: string;
    value: number;
    color: string;
  }>;
  systemStatus: {
    api: 'online' | 'offline' | 'warning';
    database: 'online' | 'offline' | 'warning';
    cache: 'online' | 'offline' | 'warning';
  };
}

export default function AnalyticsDashboard() {
  const {
    data: analyticsData,
    error,
    isLoading,
    mutate
  } = useSWR<AnalyticsData>(
    '/analytics/dashboard',
    () => apiClient.get('/analytics/dashboard'),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
      errorRetryCount: 3,
    }
  );

  if (isLoading) {
    return <OptimizedLoading variant="dashboard" />;
  }

  if (error || !analyticsData) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Analytics Unavailable</h3>
          <p className="text-muted-foreground mb-4">
            Analytics data is currently unavailable. This feature requires backend integration.
          </p>
          <Button onClick={() => mutate()} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const topProductsColumns: Column<typeof analyticsData.topProducts[0]>[] = [
    {
      key: 'name',
      label: 'Product',
      sortable: true,
      render: (value, row) => (
        <div>
          <p className="font-medium">{value}</p>
          <p className="text-sm text-muted-foreground">{row.category}</p>
        </div>
      )
    },
    {
      key: 'sales',
      label: 'Sales',
      sortable: true,
      render: (value) => (
        <Badge variant="outline">{value} units</Badge>
      )
    },
    {
      key: 'revenue',
      label: 'Revenue',
      sortable: true,
      render: (value) => (
        <span className="font-medium">₹{value.toLocaleString()}</span>
      )
    }
  ];

  return (
    <ErrorBoundaryWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h2>
            <p className="text-muted-foreground">
              Comprehensive business insights and performance metrics
            </p>
          </div>
          <Button onClick={() => mutate()} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Data
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Revenue"
            value={`₹${analyticsData.revenue.total.toLocaleString()}`}
            change={analyticsData.revenue.change}
            changeType={analyticsData.revenue.change > 0 ? 'increase' : 'decrease'}
            trend={analyticsData.revenue.trend}
            subtitle="This month"
          />
          <MetricCard
            title="Total Orders"
            value={analyticsData.orders.total.toLocaleString()}
            change={analyticsData.orders.change}
            changeType={analyticsData.orders.change > 0 ? 'increase' : 'decrease'}
            trend={analyticsData.orders.trend}
            subtitle="This month"
          />
          <MetricCard
            title="Active Customers"
            value={analyticsData.customers.total.toLocaleString()}
            change={analyticsData.customers.change}
            changeType={analyticsData.customers.change > 0 ? 'increase' : 'decrease'}
            trend={analyticsData.customers.trend}
            subtitle="This month"
          />
          <MetricCard
            title="Total Products"
            value={analyticsData.inventory.total.toLocaleString()}
            subtitle={`${analyticsData.inventory.lowStock} low stock`}
          />
        </div>

        {/* Inventory Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ProgressCard
            title="Inventory Health"
            value={analyticsData.inventory.total - analyticsData.inventory.outOfStock}
            max={analyticsData.inventory.total}
            label="Products in stock"
            variant="success"
          />
          <ProgressCard
            title="Low Stock Alert"
            value={analyticsData.inventory.lowStock}
            max={analyticsData.inventory.total}
            label="Products need restocking"
            variant="warning"
          />
          <ProgressCard
            title="Out of Stock"
            value={analyticsData.inventory.outOfStock}
            max={analyticsData.inventory.total}
            label="Products unavailable"
            variant="destructive"
          />
        </div>

        {/* Charts and Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SimpleBarChart
            title="Sales by Category"
            data={analyticsData.salesByCategory}
          />
          
          <AdvancedTable
            title="Top Performing Products"
            data={analyticsData.topProducts}
            columns={topProductsColumns}
            searchable={true}
            pagination={false}
            actions={
              <Button variant="outline" size="sm">
                <BarChart3 className="w-4 h-4 mr-2" />
                View Full Report
              </Button>
            }
          />
        </div>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatusIndicator
                status={analyticsData.systemStatus.api}
                label="API Services"
                description="Backend connectivity"
              />
              <StatusIndicator
                status={analyticsData.systemStatus.database}
                label="Database"
                description="Data persistence"
              />
              <StatusIndicator
                status={analyticsData.systemStatus.cache}
                label="Cache Layer"
                description="Performance optimization"
              />
            </div>
          </CardContent>
        </Card>

        {/* Performance Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Performance Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <Package className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold">99.9%</p>
                <p className="text-sm text-muted-foreground">Uptime</p>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">₹2.4M</p>
                <p className="text-sm text-muted-foreground">Monthly Revenue</p>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">1,247</p>
                <p className="text-sm text-muted-foreground">Active Users</p>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <ShoppingCart className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">89%</p>
                <p className="text-sm text-muted-foreground">Order Fulfillment</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundaryWrapper>
  );
}