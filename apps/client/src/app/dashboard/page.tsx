"use client";

import React from "react";
import useSWR from "swr";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent,
  CardFooter
} from "@/components/ui/card";
import { 
  Badge
} from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  CubeIcon, 
  ExclamationTriangleIcon, 
  CurrencyDollarIcon,
  ClockIcon,
  PlusIcon,
  ArrowTrendingUpIcon,
  DocumentTextIcon
} from "@heroicons/react/24/outline";
import { SearchIcon, FilterIcon } from "lucide-react";
import { apiClient } from "@/lib/api";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  change?: {
    value: number;
    type: "increase" | "decrease";
  };
  color?: "primary" | "warning" | "error" | "success";
}

function StatsCard({ title, value, icon: Icon, change, color = "primary" }: StatsCardProps) {
  const colorClasses = {
    primary: "bg-green-500",
    warning: "bg-yellow-500",
    error: "bg-red-500",
    success: "bg-green-500",
  };

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-6">
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
                {change.type === "increase" ? (
                  <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />
                ) : (
                  <ArrowTrendingUpIcon className="w-4 h-4 text-red-500 rotate-180" />
                )}
                <span
                  className={`text-sm font-medium ml-1 ${
                    change.type === "increase" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {Math.abs(change.value)}%
                </span>
                <span className="text-sm text-neutral-500 ml-1">vs last month</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-neutral-200 rounded-lg skeleton"></div>
                </div>
                <div className="ml-4 flex-1">
                  <div className="h-4 bg-neutral-200 rounded skeleton mb-2"></div>
                  <div className="h-8 bg-neutral-200 rounded skeleton"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="h-6 bg-neutral-200 rounded skeleton w-32"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="h-4 bg-neutral-200 rounded skeleton w-32"></div>
                  <div className="h-4 bg-neutral-200 rounded skeleton w-16"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <div className="h-6 bg-neutral-200 rounded skeleton w-32"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="h-4 bg-neutral-200 rounded skeleton w-32"></div>
                  <div className="h-4 bg-neutral-200 rounded skeleton w-20"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <div className="h-6 bg-neutral-200 rounded skeleton w-32"></div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center p-4 bg-neutral-50 rounded-lg">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-neutral-200 rounded skeleton"></div>
                </div>
                <div className="ml-3">
                  <div className="h-4 bg-neutral-200 rounded skeleton w-20 mb-1"></div>
                  <div className="h-3 bg-neutral-200 rounded skeleton w-16"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface DashboardStats {
  total_products: number;
  low_stock_count: number;
  total_value: number;
  expiring_batches: number;
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

interface RecentActivity {
  id: string;
  type: "product_added" | "inventory_updated" | "order_created";
  description: string;
  timestamp: string;
}

export default function DashboardPage() {
  // Fetch dashboard stats with optimized caching
  const { data: dashboardStats, error: statsError, isLoading: statsLoading } = useSWR(
    "/reports/dashboard-stats",
    () => apiClient.reports.dashboardStats(),
    { 
      revalidateOnFocus: false,
      revalidateIfStale: false,
      dedupingInterval: 30000 // 30 seconds
    }
  );

  // Fetch low stock items with limit
  const { data: lowStockItems, error: lowStockError, isLoading: lowStockLoading } = useSWR(
    "/reports/low-stock",
    () => apiClient.reports.lowStock(5), // Limit to 5 items
    { 
      revalidateOnFocus: false,
      revalidateIfStale: false,
      dedupingInterval: 60000 // 1 minute
    }
  );

  // Fetch expiring batches with limit
  const { data: expiringBatches, error: expiringError, isLoading: expiringLoading } = useSWR(
    "/reports/expiring-batches",
    () => apiClient.reports.expiringBatches(5), // Limit to 5 items
    { 
      revalidateOnFocus: false,
      revalidateIfStale: false,
      dedupingInterval: 60000 // 1 minute
    }
  );

  // Mock recent activity data (in a real app, this would come from an API)
  const recentActivity = [
    { id: "1", type: "product_added", description: "Added new product \"Organic Rice\"", timestamp: new Date(Date.now() - 3600000).toISOString() },
    { id: "2", type: "inventory_updated", description: "Updated inventory for \"Wheat Flour\"", timestamp: new Date(Date.now() - 7200000).toISOString() },
    { id: "3", type: "order_created", description: "Created purchase order #PO-78945", timestamp: new Date(Date.now() - 10800000).toISOString() },
    { id: "4", type: "product_added", description: "Added new product \"Fresh Vegetables\"", timestamp: new Date(Date.now() - 14400000).toISOString() },
    { id: "5", type: "inventory_updated", description: "Reduced stock for \"Spices Mix\"", timestamp: new Date(Date.now() - 18000000).toISOString() },
  ];

  if (statsLoading || lowStockLoading || expiringLoading) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to your AgroMart dashboard</p>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  // Only treat lowStock errors as blocking; the others are optional
  if (lowStockError) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to your AgroMart dashboard</p>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <ExclamationTriangleIcon className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 mb-2">Error loading dashboard</h3>
            <p className="text-muted-foreground">
              There was an error loading your dashboard data. Please try refreshing the page.
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
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to your AgroMart dashboard</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Products"
          value={stats.total_products || 0}
          icon={CubeIcon}
          color="primary"
          change={{ value: 12, type: "increase" }}
        />
        <StatsCard
          title="Low Stock Items"
          value={stats.low_stock_count || 0}
          icon={ExclamationTriangleIcon}
          color="warning"
        />
        <StatsCard
          title="Inventory Value"
          value={`₹${(stats.total_value || 0).toLocaleString()}`}
          icon={CurrencyDollarIcon}
          color="success"
          change={{ value: 8, type: "increase" }}
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Low Stock Items</CardTitle>
            <Button variant="ghost" size="sm">View All</Button>
          </CardHeader>
          <CardContent>
            {lowStock.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStock.map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        <div>{item.product_name}</div>
                        <div className="text-sm text-muted-foreground">SKU: {item.product_sku}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="destructive">{item.current_quantity} units</Badge>
                        <div className="text-sm text-muted-foreground">Min: {item.min_stock_level}</div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-6">
                <CubeIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No low stock items</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expiring Batches */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Expiring Batches (30 days)</CardTitle>
            <Button variant="ghost" size="sm">View All</Button>
          </CardHeader>
          <CardContent>
            {expiring.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Expiry</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expiring.map((batch: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        <div>{batch.product_name}</div>
                        <div className="text-sm text-muted-foreground">Batch: {batch.batch_number}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={batch.days_until_expiry <= 7 ? "destructive" : "secondary"}>
                          {batch.days_until_expiry} days
                        </Badge>
                        <div className="text-sm text-muted-foreground">{batch.quantity} units</div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-6">
                <ClockIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No expiring batches</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    {activity.type === "product_added" && (
                      <PlusIcon className="h-5 w-5 text-green-500" />
                    )}
                    {activity.type === "inventory_updated" && (
                      <ArrowTrendingUpIcon className="h-5 w-5 text-blue-500" />
                    )}
                    {activity.type === "order_created" && (
                      <DocumentTextIcon className="h-5 w-5 text-orange-500" />
                    )}
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(activity.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              <Button className="justify-start">
                <PlusIcon className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Add Product</div>
                  <div className="text-xs text-muted-foreground">Create a new product</div>
                </div>
              </Button>
              
              <Button variant="secondary" className="justify-start">
                <ArrowTrendingUpIcon className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Add Inventory</div>
                  <div className="text-xs text-muted-foreground">Increase stock levels</div>
                </div>
              </Button>
              
              <Button variant="outline" className="justify-start">
                <DocumentTextIcon className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Create Purchase Order</div>
                  <div className="text-xs text-muted-foreground">Order products from suppliers</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}