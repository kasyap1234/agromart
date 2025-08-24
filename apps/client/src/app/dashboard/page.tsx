"use client";

import * as React from "react";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/api";
import useSWR from "swr";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts";
import {
  Package,
  Users,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Activity,
  Box,
  Calendar,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { DashboardSkeleton } from "@/components/ui/loading";
import { cn } from "@/lib/utils";

// Mock data for charts - replace with real API calls
const salesData = [
  { name: "Jan", sales: 4000, purchases: 2400 },
  { name: "Feb", sales: 3000, purchases: 1398 },
  { name: "Mar", sales: 2000, purchases: 9800 },
  { name: "Apr", sales: 2780, purchases: 3908 },
  { name: "May", sales: 1890, purchases: 4800 },
  { name: "Jun", sales: 2390, purchases: 3800 },
];

const inventoryData = [
  { name: "In Stock", value: 400, color: "#22c55e" },
  { name: "Low Stock", value: 300, color: "#f59e0b" },
  { name: "Out of Stock", value: 100, color: "#ef4444" },
];

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  loading?: boolean;
  description?: string;
}

function KPICard({
  title,
  value,
  change,
  icon: Icon,
  loading,
  description,
}: KPICardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{loading ? "--" : value}</div>
        {change !== undefined && (
          <div className="flex items-center text-xs text-muted-foreground">
            {isPositive && (
              <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
            )}
            {isNegative && (
              <TrendingDown className="h-3 w-3 mr-1 text-red-600" />
            )}
            <span
              className={cn(
                isPositive && "text-green-600",
                isNegative && "text-red-600",
              )}
            >
              {change > 0 ? "+" : ""}
              {change}%
            </span>
            <span className="ml-1">from last month</span>
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

interface DashboardData {
  kpis: {
    totalRevenue: number;
    totalOrders: number;
    totalCustomers: number;
    inventoryValue: number;
    lowStockItems: number;
    pendingOrders: number;
  };
  salesData: any[];
  inventoryData: any[];
  recentOrders: any[];
  alerts: any[];
}

export default function DashboardPage() {
  const { user } = useAuth();

  // Fetch dashboard data
  const {
    data: dashboardData,
    error,
    isLoading,
  } = useSWR<DashboardData>(
    ["/reports/dashboard-stats"],
    () => apiClient.reports.dashboardStats() as Promise<DashboardData>,
    { refreshInterval: 60000 }, // Refresh every minute
  );

  const { data: lowStockData } = useSWR(["/reports/low-stock"], () =>
    apiClient.reports.lowStock(10),
  );

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "admin" || user?.role === "manager";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {(user as any)?.name}. Here's what's happening with
            your business.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Last 30 days
          </Button>
          {isManager && <Button size="sm">View Reports</Button>}
        </div>
      </div>

      {/* Alerts */}
      {(lowStockData as any)?.data?.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-orange-600 mr-2" />
              <CardTitle className="text-orange-900">Low Stock Alert</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-orange-800">
              {(lowStockData as any).data.length} items are running low on
              stock.
              <Button variant="link" className="p-0 h-auto text-orange-600">
                View details
              </Button>
            </p>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Revenue"
          value={`₹${dashboardData?.kpis.totalRevenue || 0}`}
          change={12.5}
          icon={DollarSign}
          loading={isLoading}
          description="Revenue this month"
        />
        <KPICard
          title="Total Orders"
          value={dashboardData?.kpis.totalOrders || 0}
          change={8.2}
          icon={ShoppingCart}
          loading={isLoading}
        />
        <KPICard
          title="Customers"
          value={dashboardData?.kpis.totalCustomers || 0}
          change={5.1}
          icon={Users}
          loading={isLoading}
        />
        <KPICard
          title="Inventory Value"
          value={`₹${dashboardData?.kpis.inventoryValue || 0}`}
          change={-2.1}
          icon={Package}
          loading={isLoading}
        />
      </div>

      {/* Charts and Analytics */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Sales & Purchases Chart */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Sales & Purchases</CardTitle>
            <CardDescription>
              Monthly comparison of sales vs purchases
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`₹${value}`, ""]} />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stackId="1"
                  stroke="#0ea5e9"
                  fill="#0ea5e9"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="purchases"
                  stackId="1"
                  stroke="#f59e0b"
                  fill="#f59e0b"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Inventory Distribution */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Inventory Status</CardTitle>
            <CardDescription>Current inventory distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={inventoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {inventoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, "Items"]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center space-x-4 mt-4">
              {inventoryData.map((item, index) => (
                <div key={index} className="flex items-center">
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics - Role-based */}
      {isManager && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            {isAdmin && <TabsTrigger value="users">Users</TabsTrigger>}
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">New order #1234</p>
                      <p className="text-xs text-muted-foreground">
                        2 minutes ago
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Inventory updated</p>
                      <p className="text-xs text-muted-foreground">
                        5 minutes ago
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-orange-500 rounded-full" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Low stock alert</p>
                      <p className="text-xs text-muted-foreground">
                        10 minutes ago
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" variant="outline">
                    <Package className="h-4 w-4 mr-2" />
                    Add New Product
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Create Purchase Order
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Users className="h-4 w-4 mr-2" />
                    Add Customer
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Activity className="h-4 w-4 mr-2" />
                    View Reports
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Inventory Health</CardTitle>
                <CardDescription>Stock levels and alerts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Stock Health</span>
                    <span className="text-sm text-muted-foreground">85%</span>
                  </div>
                  <Progress value={85} className="h-2" />

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        400
                      </div>
                      <div className="text-xs text-muted-foreground">
                        In Stock
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        45
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Low Stock
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">8</div>
                      <div className="text-xs text-muted-foreground">
                        Out of Stock
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Order Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Pending Orders</span>
                    <Badge variant="secondary">12</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Processing</span>
                    <Badge variant="default">8</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Completed</span>
                    <Badge variant="default">156</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="users" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>User Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Total Users</span>
                      <Badge variant="secondary">24</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Active Users</span>
                      <Badge variant="default">22</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Pending Invitations</span>
                      <Badge variant="secondary">2</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}
