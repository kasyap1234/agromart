"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/api";
import useSWR from "swr";
import { format, subDays } from "date-fns";
import {
  Clock,
  Search,
  Filter,
  Download,
  Activity,
  User,
  Package,
  ShoppingCart,
  Settings,
  Eye,
  Plus,
  Minus,
  Edit3,
  Trash2,
  RotateCcw,
  AlertTriangle,
  FileText,
  Calendar,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface InventoryLog {
  id: string;
  tenant_id: string;
  product_id: string;
  product_name?: string;
  batch_id: string;
  batch_number?: string;
  transaction_type: "ADD" | "REDUCE" | "TRANSFER" | "ADJUST";
  quantity_change: number;
  previous_quantity: number;
  new_quantity: number;
  transaction_date: string;
  notes?: string;
  reference_id?: string;
  created_by?: string;
  created_at: string;
}

interface SystemLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  user_id: string;
  user_name?: string;
  details: Record<string, any>;
  timestamp: string;
  ip_address?: string;
  user_agent?: string;
}

const INVENTORY_TRANSACTION_TYPES = [
  { value: "all", label: "All Transactions", icon: Activity },
  { value: "ADD", label: "Add Inventory", icon: Plus },
  { value: "REDUCE", label: "Reduce Inventory", icon: Minus },
  { value: "TRANSFER", label: "Transfer", icon: RotateCcw },
  { value: "ADJUST", label: "Adjustment", icon: Edit3 },
];

const DATE_RANGES = [
  { label: "Last 24 Hours", value: "1d", days: 1 },
  { label: "Last 7 Days", value: "7d", days: 7 },
  { label: "Last 30 Days", value: "30d", days: 30 },
  { label: "Last 90 Days", value: "90d", days: 90 },
];

export default function LogsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("inventory");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [search, setSearch] = useState("");
  const [transactionTypeFilter, setTransactionTypeFilter] = useState("all");
  const [dateRange, setDateRange] = useState("7d");

  // Calculate date range
  const { fromDate, toDate } = useMemo(() => {
    const selectedRange = DATE_RANGES.find(
      (range) => range.value === dateRange,
    );
    const days = selectedRange?.days || 7;
    const from = format(subDays(new Date(), days), "yyyy-MM-dd");
    const to = format(new Date(), "yyyy-MM-dd");
    return { fromDate: from, toDate: to };
  }, [dateRange]);

  // Fetch inventory logs
  const {
    data: inventoryLogsData,
    error: inventoryError,
    isLoading: inventoryLoading,
  } = useSWR(
    [
      "inventory-logs",
      page,
      limit,
      transactionTypeFilter,
      search,
      fromDate,
      toDate,
    ],
    () => {
      const params: any = { page, limit };
      if (search.trim()) {
        // Search across product names, batch numbers, notes
        params.search = search.trim();
      }
      if (transactionTypeFilter !== "all") {
        params.transaction_type = transactionTypeFilter;
      }
      params.start_date = fromDate;
      params.end_date = toDate;
      return apiClient.auditLogs.list(params);
    },
    { keepPreviousData: true },
  );

  const inventoryLogs: InventoryLog[] = Array.isArray(inventoryLogsData)
    ? inventoryLogsData
    : (inventoryLogsData as any)?.data || [];

  const inventoryTotal =
    (inventoryLogsData as any)?.total || inventoryLogs.length;

  // Calculate statistics
  const inventoryStats = useMemo(() => {
    const addTransactions = inventoryLogs.filter(
      (log) => log.transaction_type === "ADD",
    );
    const reduceTransactions = inventoryLogs.filter(
      (log) => log.transaction_type === "REDUCE",
    );
    const transferTransactions = inventoryLogs.filter(
      (log) => log.transaction_type === "TRANSFER",
    );
    const adjustTransactions = inventoryLogs.filter(
      (log) => log.transaction_type === "ADJUST",
    );

    return {
      total: inventoryLogs.length,
      additions: addTransactions.length,
      reductions: reduceTransactions.length,
      transfers: transferTransactions.length,
      adjustments: adjustTransactions.length,
      totalQuantityAdded: addTransactions.reduce(
        (sum, log) => sum + Math.abs(log.quantity_change),
        0,
      ),
      totalQuantityReduced: reduceTransactions.reduce(
        (sum, log) => sum + Math.abs(log.quantity_change),
        0,
      ),
    };
  }, [inventoryLogs]);

  const getTransactionIcon = (transactionType: string) => {
    switch (transactionType) {
      case "ADD":
        return Plus;
      case "REDUCE":
        return Minus;
      case "TRANSFER":
        return RotateCcw;
      case "ADJUST":
        return Edit3;
      default:
        return Activity;
    }
  };

  const getTransactionVariant = (
    transactionType: string,
  ): "default" | "destructive" | "outline" | "secondary" => {
    switch (transactionType) {
      case "ADD":
        return "default";
      case "REDUCE":
        return "destructive";
      case "TRANSFER":
        return "secondary";
      case "ADJUST":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getQuantityChangeColor = (quantityChange: number) => {
    if (quantityChange > 0) return "text-green-600";
    if (quantityChange < 0) return "text-red-600";
    return "text-gray-600";
  };

  const handleExport = async (type: "csv" | "pdf" = "csv") => {
    try {
      const params = {
        format: type,
        start_date: fromDate,
        end_date: toDate,
      };

      await apiClient.auditLogs.export(params);
      toast.success(
        `${type.toUpperCase()} export started. Download will begin shortly.`,
      );
    } catch (error: any) {
      toast.error(error?.message || "Export failed");
    }
  };

  const isManager = user?.role === "admin" || user?.role === "manager";

  if (!isManager) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Access Denied</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            You don't have permission to view audit logs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground">
            Complete audit trail of all system activities and changes
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("csv")}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Transactions
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventoryStats.total}</div>
            <p className="text-xs text-muted-foreground">
              All inventory movements
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items Added</CardTitle>
            <Plus className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {inventoryStats.totalQuantityAdded.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {inventoryStats.additions} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items Reduced</CardTitle>
            <Minus className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {inventoryStats.totalQuantityReduced.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {inventoryStats.reductions} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Adjustments</CardTitle>
            <Edit3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {inventoryStats.transfers + inventoryStats.adjustments}
            </div>
            <p className="text-xs text-muted-foreground">
              Transfers & adjustments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different log types */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Inventory Logs
          </TabsTrigger>
          <TabsTrigger
            value="system"
            className="flex items-center gap-2"
            disabled
          >
            <Settings className="h-4 w-4" />
            System Logs
          </TabsTrigger>
          <TabsTrigger
            value="user"
            className="flex items-center gap-2"
            disabled
          >
            <User className="h-4 w-4" />
            User Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search products, batches, notes..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Select
                    value={transactionTypeFilter}
                    onValueChange={setTransactionTypeFilter}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Transaction type" />
                    </SelectTrigger>
                    <SelectContent>
                      {INVENTORY_TRANSACTION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Inventory Logs Table */}
          <Card>
            <CardHeader>
              <CardTitle>Inventory Transaction History</CardTitle>
              <CardDescription>
                Detailed record of all inventory movements ({inventoryTotal}{" "}
                total transactions)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {inventoryLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Loading transaction history...
                    </p>
                  </div>
                </div>
              ) : inventoryError ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
                    <h3 className="mt-2 text-lg font-medium text-gray-900">
                      Error loading logs
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Failed to load inventory logs. Please try again.
                    </p>
                    <Button
                      onClick={() => window.location.reload()}
                      className="mt-4"
                      variant="outline"
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              ) : inventoryLogs.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900">
                    No transactions found
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {search || transactionTypeFilter !== "all"
                      ? "Try adjusting your search or filters"
                      : "No inventory transactions recorded yet."}
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Transaction</TableHead>
                        <TableHead>Product & Batch</TableHead>
                        <TableHead>Quantity Change</TableHead>
                        <TableHead>Before → After</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Reference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventoryLogs.map((log) => {
                        const TransactionIcon = getTransactionIcon(
                          log.transaction_type,
                        );

                        return (
                          <TableRow key={log.id}>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <div className="font-medium text-sm">
                                    {format(
                                      new Date(log.transaction_date),
                                      "MMM dd, yyyy",
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {format(
                                      new Date(log.transaction_date),
                                      "HH:mm:ss",
                                    )}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <TransactionIcon className="h-4 w-4" />
                                <Badge
                                  variant={getTransactionVariant(
                                    log.transaction_type,
                                  )}
                                >
                                  {log.transaction_type}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium text-sm">
                                  {log.product_name ||
                                    `Product ${log.product_id.slice(-8)}`}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Batch:{" "}
                                  {log.batch_number || log.batch_id.slice(-8)}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div
                                className={cn(
                                  "font-mono font-medium text-sm",
                                  getQuantityChangeColor(log.quantity_change),
                                )}
                              >
                                {log.quantity_change > 0 ? "+" : ""}
                                {log.quantity_change.toLocaleString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm font-mono">
                                <span className="text-muted-foreground">
                                  {log.previous_quantity.toLocaleString()}
                                </span>
                                <span className="mx-2">→</span>
                                <span className="font-medium">
                                  {log.new_quantity.toLocaleString()}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-muted-foreground max-w-xs">
                                {log.notes ? (
                                  <span
                                    title={log.notes}
                                    className="truncate block"
                                  >
                                    {log.notes}
                                  </span>
                                ) : (
                                  <span>—</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs text-muted-foreground font-mono">
                                {log.reference_id ? (
                                  <span title={log.reference_id}>
                                    {log.reference_id.slice(-8)}
                                  </span>
                                ) : (
                                  <span>—</span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination */}
              {inventoryLogs.length > 0 && (
                <div className="flex items-center justify-between px-2 py-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {inventoryLogs.length} of {inventoryTotal}{" "}
                    transactions
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page <= 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={inventoryLogs.length < limit}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Settings className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-lg font-medium text-gray-900">
                  System Logs
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  System audit logs will be available in a future update.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="user" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <User className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-lg font-medium text-gray-900">
                  User Activity Logs
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  User activity logs will be available in a future update.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
