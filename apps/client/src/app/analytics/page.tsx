"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/api";
import useSWR from "swr";
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
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
  AreaChart,
  Area,
  ComposedChart,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  ShoppingCart,
  Users,
  Calendar,
  Download,
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Eye,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface KPI {
  total_revenue: number;
  total_orders: number;
  total_customers: number;
  inventory_value: number;
  low_stock_items: number;
  avg_order_value: number;
  growth_rate: number;
  profit_margin: number;
}

interface SalesDataPoint {
  date: string;
  sales: number;
  orders: number;
  customers: number;
}

interface PurchaseDataPoint {
  date: string;
  purchases: number;
  orders: number;
  suppliers: number;
}

interface InventorySnapshot {
  total_products: number;
  total_value: number;
  low_stock_count: number;
  out_of_stock_count: number;
  categories: Array<{
    name: string;
    value: number;
    count: number;
  }>;
}

const DATE_RANGES = [
  { label: "Last 7 Days", value: "7d", days: 7 },
  { label: "Last 30 Days", value: "30d", days: 30 },
  { label: "Last 90 Days", value: "90d", days: 90 },
  { label: "Last 6 Months", value: "6m", days: 180 },
  { label: "Last 12 Months", value: "12m", days: 365 },
];

const CHART_COLORS = [
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
];

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  loading?: boolean;
  description?: string;
  trend?: "up" | "down" | "neutral";
}

function KPICard({
  title,
  value,
  change,
  icon: Icon,
  loading,
  description,
  trend,
}: KPICardProps) {
  const getTrendColor = () => {
    if (trend === "up") return "text-green-600";
    if (trend === "down") return "text-red-600";
    return "text-gray-600";
  };

  const getTrendIcon = () => {
    if (trend === "up") return <TrendingUp className="h-3 w-3" />;
    if (trend === "down") return <TrendingDown className="h-3 w-3" />;
    return null;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {loading ? (
            <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          ) : (
            value
          )}
        </div>
        {change !== undefined && !loading && (
          <div className={cn("flex items-center text-xs", getTrendColor())}>
            {getTrendIcon()}
            <span className="ml-1">
              {change > 0 ? "+" : ""}
              {change}%
            </span>
            <span className="ml-1 text-muted-foreground">from last period</span>
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState("30d");
  const [chartView, setChartView] = useState("combined");

  // Calculate date range
  const { fromDate, toDate } = useMemo(() => {
    const selectedRange = DATE_RANGES.find(
      (range) => range.value === dateRange,
    );
    const days = selectedRange?.days || 30;
    const from = format(subDays(new Date(), days), "yyyy-MM-dd");
    const to = format(new Date(), "yyyy-MM-dd");
    return { fromDate: from, toDate: to };
  }, [dateRange]);

  // Fetch analytics data
  const { data: kpiData, isLoading: kpiLoading } = useSWR<KPI>(
    ["analytics/kpis", fromDate, toDate],
    () =>
      apiClient.analytics.getKPIs({
        from_date: fromDate,
        to_date: toDate,
      }) as Promise<KPI>,
    { refreshInterval: 300000 }, // 5 minutes
  );

  const { data: salesData, isLoading: salesLoading } = useSWR<SalesDataPoint[]>(
    ["analytics/sales", fromDate, toDate],
    () =>
      apiClient.analytics.getSalesSeries({
        from_date: fromDate,
        to_date: toDate,
        group: dateRange === "12m" ? "month" : "day",
      }) as Promise<SalesDataPoint[]>,
    { refreshInterval: 300000 },
  );

  const { data: purchasesData, isLoading: purchasesLoading } = useSWR<
    PurchaseDataPoint[]
  >(
    ["analytics/purchases", fromDate, toDate],
    () =>
      apiClient.analytics.getPurchasesSeries({
        from_date: fromDate,
        to_date: toDate,
        group: dateRange === "12m" ? "month" : "day",
      }) as Promise<PurchaseDataPoint[]>,
    { refreshInterval: 300000 },
  );

  const { data: inventoryData, isLoading: inventoryLoading } =
    useSWR<InventorySnapshot>(
      ["analytics/inventory"],
      () =>
        apiClient.analytics.getInventorySnapshot() as Promise<InventorySnapshot>,
      { refreshInterval: 600000 }, // 10 minutes
    );

  // Process data for charts
  const salesChartData = useMemo(() => {
    if (!salesData) return [];
    return salesData.map((item) => ({
      date: format(
        new Date(item.date),
        dateRange === "12m" ? "MMM yyyy" : "MMM dd",
      ),
      sales: item.sales,
      orders: item.orders,
      customers: item.customers,
    }));
  }, [salesData, dateRange]);

  const purchasesChartData = useMemo(() => {
    if (!purchasesData) return [];
    return purchasesData.map((item) => ({
      date: format(
        new Date(item.date),
        dateRange === "12m" ? "MMM yyyy" : "MMM dd",
      ),
      purchases: item.purchases,
      orders: item.orders,
      suppliers: item.suppliers,
    }));
  }, [purchasesData, dateRange]);

  const combinedChartData = useMemo(() => {
    if (!salesData || !purchasesData) return [];

    const salesMap = new Map(salesData.map((item) => [item.date, item]));
    const purchasesMap = new Map(
      purchasesData.map((item) => [item.date, item]),
    );

    const allDates = new Set([
      ...salesData.map((s) => s.date),
      ...purchasesData.map((p) => p.date),
    ]);

    return Array.from(allDates)
      .sort()
      .map((date) => ({
        date: format(
          new Date(date),
          dateRange === "12m" ? "MMM yyyy" : "MMM dd",
        ),
        sales: salesMap.get(date)?.sales || 0,
        purchases: purchasesMap.get(date)?.purchases || 0,
        profit:
          (salesMap.get(date)?.sales || 0) -
          (purchasesMap.get(date)?.purchases || 0),
      }));
  }, [salesData, purchasesData, dateRange]);

  const inventoryChartData = useMemo(() => {
    if (!inventoryData?.categories) return [];
    return inventoryData.categories.slice(0, 8); // Top 8 categories
  }, [inventoryData]);

  const isLoading =
    kpiLoading || salesLoading || purchasesLoading || inventoryLoading;
  const isManager = user?.role === "admin" || user?.role === "manager";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive business insights and performance metrics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[160px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGES.map((range) => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isManager && (
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Revenue"
          value={kpiData ? `₹${kpiData.total_revenue.toLocaleString()}` : "—"}
          change={kpiData?.growth_rate}
          icon={DollarSign}
          loading={kpiLoading}
          trend={
            kpiData?.growth_rate
              ? kpiData.growth_rate > 0
                ? "up"
                : "down"
              : "neutral"
          }
        />
        <KPICard
          title="Total Orders"
          value={kpiData?.total_orders || "—"}
          change={12.5}
          icon={ShoppingCart}
          loading={kpiLoading}
          trend="up"
        />
        <KPICard
          title="Active Customers"
          value={kpiData?.total_customers || "—"}
          change={8.2}
          icon={Users}
          loading={kpiLoading}
          trend="up"
        />
        <KPICard
          title="Inventory Value"
          value={kpiData ? `₹${kpiData.inventory_value.toLocaleString()}` : "—"}
          change={-2.1}
          icon={Package}
          loading={kpiLoading}
          trend="down"
          description={
            kpiData?.low_stock_items
              ? `${kpiData.low_stock_items} items low stock`
              : undefined
          }
        />
      </div>

      {/* Additional KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <KPICard
          title="Avg Order Value"
          value={kpiData ? `₹${kpiData.avg_order_value?.toFixed(2) || 0}` : "—"}
          change={5.4}
          icon={TrendingUp}
          loading={kpiLoading}
          trend="up"
        />
        <KPICard
          title="Profit Margin"
          value={kpiData ? `${kpiData.profit_margin?.toFixed(1) || 0}%` : "—"}
          change={1.2}
          icon={Activity}
          loading={kpiLoading}
          trend="up"
        />
        <KPICard
          title="Low Stock Items"
          value={kpiData?.low_stock_items || "—"}
          icon={Package}
          loading={kpiLoading}
          description="Items below reorder point"
        />
      </div>

      {/* Charts */}
      <Tabs
        value={chartView}
        onValueChange={setChartView}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="combined" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="sales" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Sales
            </TabsTrigger>
            <TabsTrigger value="purchases" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Purchases
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <PieChartIcon className="h-4 w-4" />
              Inventory
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="combined" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Revenue vs Expenses */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue vs Purchases</CardTitle>
                <CardDescription>
                  Compare revenue and purchase costs over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-[300px] bg-gray-100 rounded animate-pulse"></div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={combinedChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip
                        formatter={(value, name) => [`₹${value}`, name]}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Bar dataKey="sales" fill="#0ea5e9" name="Sales" />
                      <Bar
                        dataKey="purchases"
                        fill="#f59e0b"
                        name="Purchases"
                      />
                      <Line
                        type="monotone"
                        dataKey="profit"
                        stroke="#10b981"
                        strokeWidth={3}
                        name="Profit"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Profit Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Profit Trend</CardTitle>
                <CardDescription>Track profitability over time</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-[300px] bg-gray-100 rounded animate-pulse"></div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={combinedChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip
                        formatter={(value) => [`₹${value}`, "Profit"]}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Area
                        type="monotone"
                        dataKey="profit"
                        stroke="#10b981"
                        fill="#10b981"
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sales" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Sales Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Sales Trend</CardTitle>
                <CardDescription>
                  Track sales performance over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                {salesLoading ? (
                  <div className="h-[300px] bg-gray-100 rounded animate-pulse"></div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={salesChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip
                        formatter={(value) => [`₹${value}`, "Sales"]}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Line
                        type="monotone"
                        dataKey="sales"
                        stroke="#0ea5e9"
                        strokeWidth={3}
                        dot={{ fill: "#0ea5e9", strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Orders & Customers */}
            <Card>
              <CardHeader>
                <CardTitle>Orders & Customer Activity</CardTitle>
                <CardDescription>
                  Track order volume and customer engagement
                </CardDescription>
              </CardHeader>
              <CardContent>
                {salesLoading ? (
                  <div className="h-[300px] bg-gray-100 rounded animate-pulse"></div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={salesChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="orders" fill="#10b981" name="Orders" />
                      <Line
                        type="monotone"
                        dataKey="customers"
                        stroke="#f59e0b"
                        strokeWidth={3}
                        name="Active Customers"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="purchases" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Purchase Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Purchase Trend</CardTitle>
                <CardDescription>
                  Track purchase expenses over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                {purchasesLoading ? (
                  <div className="h-[300px] bg-gray-100 rounded animate-pulse"></div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={purchasesChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip
                        formatter={(value) => [`₹${value}`, "Purchases"]}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Area
                        type="monotone"
                        dataKey="purchases"
                        stroke="#f59e0b"
                        fill="#f59e0b"
                        fillOpacity={0.6}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Purchase Orders & Suppliers */}
            <Card>
              <CardHeader>
                <CardTitle>Purchase Orders & Suppliers</CardTitle>
                <CardDescription>
                  Track purchase order volume and supplier activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                {purchasesLoading ? (
                  <div className="h-[300px] bg-gray-100 rounded animate-pulse"></div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={purchasesChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar
                        dataKey="orders"
                        fill="#8b5cf6"
                        name="Purchase Orders"
                      />
                      <Line
                        type="monotone"
                        dataKey="suppliers"
                        stroke="#ec4899"
                        strokeWidth={3}
                        name="Active Suppliers"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Inventory by Category */}
            <Card>
              <CardHeader>
                <CardTitle>Inventory by Category</CardTitle>
                <CardDescription>
                  Distribution of inventory value across categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                {inventoryLoading ? (
                  <div className="h-[300px] bg-gray-100 rounded animate-pulse"></div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={inventoryChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {inventoryChartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`₹${value}`, "Value"]} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                {inventoryChartData.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {inventoryChartData.map((item, index) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor:
                              CHART_COLORS[index % CHART_COLORS.length],
                          }}
                        />
                        <span className="text-sm text-muted-foreground truncate">
                          {item.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Inventory Status */}
            <Card>
              <CardHeader>
                <CardTitle>Inventory Status</CardTitle>
                <CardDescription>
                  Current stock levels and alerts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {inventoryLoading ? (
                  <div className="space-y-4">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className="h-12 bg-gray-100 rounded animate-pulse"
                      ></div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600">
                          {inventoryData?.total_products || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Total Products
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600">
                          ₹{inventoryData?.total_value?.toLocaleString() || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Total Value
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">
                          Low Stock Items
                        </span>
                        <Badge variant="secondary">
                          {inventoryData?.low_stock_count || 0}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">
                          Out of Stock
                        </span>
                        <Badge variant="destructive">
                          {inventoryData?.out_of_stock_count || 0}
                        </Badge>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <h4 className="text-sm font-medium mb-2">
                        Quick Actions
                      </h4>
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Low Stock Report
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                        >
                          <Package className="mr-2 h-4 w-4" />
                          Inventory Overview
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
