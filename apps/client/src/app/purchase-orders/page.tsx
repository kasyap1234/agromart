"use client";

import useSWR from "swr";
import Link from "next/link";
import { useState } from "react";
import { 
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { PlusIcon, DownloadIcon } from "lucide-react";
import { apiClient } from "@/lib/api";
import { formatDate } from "@/lib/date";

interface PurchaseOrder {
  id: string;
  supplier_id: string;
  supplier_name: string;
  status: "pending" | "received" | "cancelled";
  total_amount: number;
  created_at: string;
  expected_delivery_date?: string;
  items: PurchaseOrderItem[];
}

interface PurchaseOrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

const STATUS_COLORS = {
  pending: "secondary",
  received: "default",
  cancelled: "destructive",
} as const;

const STATUS_LABELS = {
  pending: "Pending",
  received: "Received",
  cancelled: "Cancelled",
};

export default function PurchaseOrdersPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const { data, error, isLoading, mutate } = useSWR(
    ["purchase-orders", page, limit, statusFilter],
    () => {
      const params: any = { page, limit };
      if (statusFilter) params.status = statusFilter;
      return apiClient.purchaseOrders.list(params);
    },
    { 
      keepPreviousData: true,
      revalidateOnFocus: false
    }
  );

  const purchaseOrders = Array.isArray(data) ? data : [];
  const hasNextPage = purchaseOrders.length === limit;
  const hasPrevPage = page > 1;

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
            <p className="text-muted-foreground">Manage your purchase orders</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" asChild>
              <a href="/api/purchase-orders.csv">
                <DownloadIcon className="w-4 h-4 mr-2" />
                Export CSV
              </a>
            </Button>
            <Button asChild>
              <Link href={"/purchase-orders/new" as any}>
                <PlusIcon className="w-4 h-4 mr-2" />
                Create PO
              </Link>
            </Button>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-red-500 mb-4">Failed to load purchase orders.</div>
            <Button variant="outline" onClick={() => mutate()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
          <p className="text-muted-foreground">Manage your purchase orders</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" asChild>
            <a href="/api/purchase-orders.csv">
              <DownloadIcon className="w-4 h-4 mr-2" />
              Export CSV
            </a>
          </Button>
          <Button asChild>
            <Link href={"/purchase-orders/new" as any}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Create PO
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="max-w-xs">
              <Select onValueChange={(value: string) => {
                setStatusFilter(value);
                setPage(1);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button variant="outline" onClick={() => {
              setStatusFilter("");
              setPage(1);
            }}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {!isLoading && purchaseOrders.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-muted-foreground mb-4">No purchase orders found.</div>
            <Button asChild>
              <Link href={"/purchase-orders/new" as any}>Create a new purchase order</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        !isLoading && (
          <>
            {/* Purchase Orders Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO Number</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseOrders.map((po: PurchaseOrder) => (
                      <TableRow key={po.id}>
                        <TableCell className="font-medium">
                          PO-{po.id.slice(0, 8)}
                        </TableCell>
                        <TableCell>{po.supplier_name}</TableCell>
                        <TableCell>{formatDate(po.created_at)}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_COLORS[po.status]}>
                            {STATUS_LABELS[po.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          ₹{po.total_amount?.toFixed(2) || "0.00"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/purchase-orders/${po.id}` as any}>View</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
              <CardFooter className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">Rows per page</span>
                  <Select value={String(limit)} onValueChange={(value: string) => {
                    setLimit(Number(value));
                    setPage(1);
                  }}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={!hasPrevPage}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={!hasNextPage}
                  >
                    Next
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </>
        )
      )}
    </div>
  );
}