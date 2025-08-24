"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/api";
import useSWR from "swr";
import { format } from "date-fns";
import {
  Package,
  Search,
  Filter,
  Plus,
  Minus,
  Edit3,
  Eye,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Calendar,
  Download,
  MoreVertical,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface InventoryItem {
  id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  batch_id: string;
  batch_number: string;
  quantity: number;
  unit_price: number;
  total_value: number;
  cost_price: number;
  last_updated: string;
  expiry_date?: string;
  location_id?: string;
  location_name?: string;
  min_stock_level?: number;
  max_stock_level?: number;
  reorder_point?: number;
}

interface InventoryStats {
  total_products: number;
  total_value: number;
  low_stock_count: number;
  out_of_stock_count: number;
  expiring_soon_count: number;
  total_quantity: number;
}

const STOCK_STATUS_FILTERS = [
  { value: "all", label: "All Items" },
  { value: "in_stock", label: "In Stock" },
  { value: "low_stock", label: "Low Stock" },
  { value: "out_of_stock", label: "Out of Stock" },
  { value: "expiring_soon", label: "Expiring Soon" },
];

export default function InventoryPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<"add" | "reduce">("add");
  const [adjustmentQuantity, setAdjustmentQuantity] = useState("");
  const [adjustmentNotes, setAdjustmentNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch inventory data
  const {
    data: inventoryData,
    error,
    isLoading,
    mutate,
  } = useSWR(
    ["inventory", page, limit, search, statusFilter],
    () => {
      const params: any = { page, limit };
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== "all") params.status = statusFilter;
      return apiClient.inventory.list(params);
    },
    { keepPreviousData: true },
  );

  // Fetch inventory statistics
  const { data: statsData, isLoading: statsLoading } = useSWR<InventoryStats>(
    ["inventory/stats"],
    () => apiClient.get("/inventory/stats") as Promise<InventoryStats>,
    { refreshInterval: 300000 },
  );

  const inventoryItems: InventoryItem[] = Array.isArray(inventoryData)
    ? inventoryData
    : (inventoryData as any)?.data || [];

  const totalItems = (inventoryData as any)?.total || inventoryItems.length;

  // Calculate stock status
  const getStockStatus = (item: InventoryItem) => {
    if (item.quantity === 0) return "out_of_stock";
    if (item.reorder_point && item.quantity <= item.reorder_point)
      return "low_stock";
    if (
      item.expiry_date &&
      new Date(item.expiry_date) <=
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    )
      return "expiring_soon";
    return "in_stock";
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case "in_stock":
        return "text-green-600";
      case "low_stock":
        return "text-yellow-600";
      case "out_of_stock":
        return "text-red-600";
      case "expiring_soon":
        return "text-orange-600";
      default:
        return "text-gray-600";
    }
  };

  const getStockStatusBadge = (status: string) => {
    switch (status) {
      case "in_stock":
        return <Badge variant="default">In Stock</Badge>;
      case "low_stock":
        return <Badge variant="secondary">Low Stock</Badge>;
      case "out_of_stock":
        return <Badge variant="destructive">Out of Stock</Badge>;
      case "expiring_soon":
        return <Badge variant="outline">Expiring Soon</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const handleAdjustStock = async () => {
    if (!selectedItem || !adjustmentQuantity || isSubmitting) return;

    const quantity = parseInt(adjustmentQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    setIsSubmitting(true);
    try {
      const adjustmentData = {
        product_id: selectedItem.product_id,
        batch_id: selectedItem.batch_id,
        quantity: adjustmentType === "add" ? quantity : -quantity,
        notes: adjustmentNotes,
      };

      if (adjustmentType === "add") {
        await apiClient.inventory.add(adjustmentData);
        toast.success(`Added ${quantity} units to inventory`);
      } else {
        await apiClient.inventory.reduce(adjustmentData);
        toast.success(`Removed ${quantity} units from inventory`);
      }

      mutate();
      setShowAdjustDialog(false);
      setSelectedItem(null);
      setAdjustmentQuantity("");
      setAdjustmentNotes("");
    } catch (error: any) {
      toast.error(error?.message || "Failed to adjust inventory");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdjustClick = (item: InventoryItem, type: "add" | "reduce") => {
    setSelectedItem(item);
    setAdjustmentType(type);
    setShowAdjustDialog(true);
  };

  const isManager = user?.role === "admin" || user?.role === "manager";

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-4 text-lg font-semibold">
            Error loading inventory
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Please try refreshing the page
          </p>
          <Button onClick={() => mutate()} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground">
            Track and manage your product inventory levels
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <BarChart3 className="mr-2 h-4 w-4" />
            Reports
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Products
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "—" : statsData?.total_products || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Unique products in inventory
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statsLoading
                ? "—"
                : `₹${statsData?.total_value?.toLocaleString() || 0}`}
            </div>
            <p className="text-xs text-muted-foreground">
              Total inventory value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {statsLoading ? "—" : statsData?.low_stock_count || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Items below reorder point
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {statsLoading ? "—" : statsData?.out_of_stock_count || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Items with zero quantity
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search products, SKUs, batches..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  {STOCK_STATUS_FILTERS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Items ({totalItems})</CardTitle>
          <CardDescription>
            Current stock levels and inventory details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Loading inventory...
                </p>
              </div>
            </div>
          ) : inventoryItems.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">
                No inventory found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {search || statusFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Start by adding products to your inventory."}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Updated</TableHead>
                    {isManager && (
                      <TableHead className="text-right">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryItems.map((item) => {
                    const stockStatus = getStockStatus(item);
                    const stockPercentage = item.max_stock_level
                      ? (item.quantity / item.max_stock_level) * 100
                      : 100;

                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {item.product_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              SKU: {item.product_sku}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {item.batch_number}
                            </div>
                            {item.expiry_date && (
                              <div className="text-sm text-muted-foreground">
                                Exp:{" "}
                                {format(
                                  new Date(item.expiry_date),
                                  "MMM dd, yyyy",
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {item.location_name || "—"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div>
                            <div className="font-medium">
                              {item.quantity.toLocaleString()}
                            </div>
                            {item.reorder_point && (
                              <div className="text-xs text-muted-foreground">
                                Min: {item.reorder_point}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          ₹{item.unit_price?.toFixed(2) || "0.00"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-medium">
                            ₹{item.total_value?.toFixed(2) || "0.00"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStockStatusBadge(stockStatus)}
                          {item.max_stock_level && (
                            <Progress
                              value={Math.min(stockPercentage, 100)}
                              className="w-16 h-1 mt-1"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {format(
                              new Date(item.last_updated),
                              "MMM dd, yyyy",
                            )}
                          </div>
                        </TableCell>
                        {isManager && (
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() => handleAdjustClick(item, "add")}
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  Add Stock
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleAdjustClick(item, "reduce")
                                  }
                                >
                                  <Minus className="mr-2 h-4 w-4" />
                                  Reduce Stock
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Logs
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Edit3 className="mr-2 h-4 w-4" />
                                  Edit Details
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {inventoryItems.length > 0 && (
            <div className="flex items-center justify-between px-2 py-4">
              <div className="text-sm text-muted-foreground">
                Showing {inventoryItems.length} of {totalItems} items
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
                  disabled={inventoryItems.length < limit}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stock Adjustment Dialog */}
      <Dialog open={showAdjustDialog} onOpenChange={setShowAdjustDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {adjustmentType === "add" ? "Add Stock" : "Reduce Stock"}
            </DialogTitle>
            <DialogDescription>
              {adjustmentType === "add"
                ? "Add inventory to this product batch"
                : "Remove inventory from this product batch"}
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Product</Label>
                <div className="text-sm">
                  <div className="font-medium">{selectedItem.product_name}</div>
                  <div className="text-muted-foreground">
                    Batch: {selectedItem.batch_number}
                  </div>
                  <div className="text-muted-foreground">
                    Current Stock: {selectedItem.quantity.toLocaleString()}{" "}
                    units
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  placeholder="Enter quantity"
                  value={adjustmentQuantity}
                  onChange={(e) => setAdjustmentQuantity(e.target.value)}
                  min="1"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  placeholder="Reason for adjustment (optional)"
                  value={adjustmentNotes}
                  onChange={(e) => setAdjustmentNotes(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAdjustDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAdjustStock}
              disabled={isSubmitting || !adjustmentQuantity}
            >
              {isSubmitting
                ? "Processing..."
                : adjustmentType === "add"
                  ? "Add Stock"
                  : "Reduce Stock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
