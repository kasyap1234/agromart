"use client";

import React from "react";
import useSWR from "swr";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent
} from "@/components/ui/card";
import { 
  Badge
} from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Package, 
  AlertTriangle, 
  DollarSign,
  Clock,
  Plus,
  ArrowUp,
  FileText
} from "lucide-react";
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

function StatsCard({ title, value, icon: Icon, color = "primary" }: StatsCardProps) {
  const colorClasses = {
    primary: "from-blue-50 to-blue-100 border-blue-200 text-blue-900",
    warning: "from-amber-50 to-amber-100 border-amber-200 text-amber-900",
    error: "from-rose-50 to-rose-100 border-rose-200 text-rose-900",
    success: "from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-900",
  };

  const iconColorClasses = {
    primary: "text-blue-600",
    warning: "text-amber-600",
    error: "text-rose-600",
    success: "text-emerald-600",
  };

  return (
    <Card className={`border bg-gradient-to-br ${colorClasses[color]}`}>
      <CardContent className="p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Icon className={`w-8 h-8 ${iconColorClasses[color]}`} />
          </div>
          <div className="ml-4 flex-1">
            <p className="text-sm font-medium">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
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
                  <div className="w-12 h-12 bg-neutral-200 rounded-full skeleton"></div>
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
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Error loading dashboard</h3>
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg font-medium">Low Stock Items</CardTitle>
            <Button variant="outline" size="sm">View All</Button>
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
                    <TableRow key={index} className="hover:bg-muted/50">
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
                <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No low stock items</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expiring Batches */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg font-medium">Expiring Batches (30 days)</CardTitle>
            <Button variant="outline" size="sm">View All</Button>
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
                    <TableRow key={index} className="hover:bg-muted/50">
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
                <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
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
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {activity.type === "product_added" && (
                      <div className="bg-success-500/10 text-success-500 w-8 h-8 rounded-full flex items-center justify-center">
                        <Plus className="w-4 h-4" />
                      </div>
                    )}
                    {activity.type === "inventory_updated" && (
                      <div className="bg-primary-500/10 text-primary-500 w-8 h-8 rounded-full flex items-center justify-center">
                        <ArrowUp className="w-4 h-4" />
                      </div>
                    )}
                    {activity.type === "order_created" && (
                      <div className="bg-orange-500/10 text-orange-500 w-8 h-8 rounded-full flex items-center justify-center">
                        <FileText className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
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
              <Button className="justify-start h-16 rounded-lg">
                <div className="bg-primary-500/10 text-primary-500 w-10 h-10 rounded-lg flex items-center justify-center mr-3">
                  <Plus className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Add Product</div>
                  <div className="text-xs text-muted-foreground">Create a new product</div>
                </div>
              </Button>
              
              <Button variant="outline" className="justify-start h-16 rounded-lg">
                <div className="bg-primary-500/10 text-primary-500 w-10 h-10 rounded-lg flex items-center justify-center mr-3">
                  <ArrowUp className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Add Inventory</div>
                  <div className="text-xs text-muted-foreground">Increase stock levels</div>
                </div>
              </Button>
              
              <Button variant="outline" className="justify-start h-16 rounded-lg">
                <div className="bg-primary-500/10 text-primary-500 w-10 h-10 rounded-lg flex items-center justify-center mr-3">
                  <FileText className="w-5 h-5" />
                </div>
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