"use client";

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Shield,
  Search,
  Filter,
  Download,
  Clock,
  User,
  Activity,
  AlertTriangle,
  FileText,
  Calendar,
  Eye,
  Edit,
  Trash2,
  Plus,
  ShoppingCart,
  Package,
  Users,
  Settings
} from 'lucide-react';
import { usePermissions } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';

interface InventoryLog {
  id: string;
  tenant_id: string;
  product_id: string;
  product_name?: string;
  batch_id: string;
  batch_number?: string;
  transaction_type: 'ADD' | 'REDUCE' | 'TRANSFER' | 'ADJUST';
  quantity_change: number;
  previous_quantity: number;
  new_quantity: number;
  transaction_date: string;
  notes?: string;
  reference_id?: string;
  created_at: string;
}

const TRANSACTION_TYPES = [
  { value: 'all', label: 'All Transactions' },
  { value: 'ADD', label: 'Add Inventory' },
  { value: 'REDUCE', label: 'Reduce Inventory' },
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'ADJUST', label: 'Adjustment' },
];

export default function LogsPage() {
  const { canViewReports } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTransactionType, setSelectedTransactionType] = useState('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [page, setPage] = useState(1);
  const [limit] = useState(50);

  // Fetch inventory logs from API
  const { data, error, isLoading } = useSWR(
    ['/inventory/logs', { 
      page, 
      limit,
      ...(selectedTransactionType !== 'all' && { transaction_type: selectedTransactionType })
    }], 
    ([url, params]) => apiClient.auditLogs.list(params)
  );

  const inventoryLogs: InventoryLog[] = (data as any)?.data || [];
  const totalLogs = (data as any)?.total || 0;

  // Filter logs locally (in addition to server-side filtering)
  const filteredLogs = inventoryLogs.filter(log => {
    if (searchTerm && !log.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !log.batch_number?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !log.transaction_type.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !log.notes?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const getTransactionIcon = (transactionType: string) => {
    switch (transactionType) {
      case 'ADD': return Plus;
      case 'REDUCE': return Trash2;
      case 'TRANSFER': return Activity;
      case 'ADJUST': return Edit;
      default: return Activity;
    }
  };

  const getTransactionVariant = (transactionType: string) => {
    switch (transactionType) {
      case 'ADD': return 'default';
      case 'REDUCE': return 'destructive';
      case 'TRANSFER': return 'secondary';
      case 'ADJUST': return 'outline';
      default: return 'secondary';
    }
  };

  const getQuantityChangeColor = (quantityChange: number) => {
    if (quantityChange > 0) return 'text-green-600';
    if (quantityChange < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const handleExportLogs = () => {
    toast('Export functionality coming soon', { icon: 'ℹ️' });
  };

  // Check permissions
  if (!canViewReports) {
    return (
      <DashboardLayout title="Audit Logs">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Access Denied</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                You don't have permission to view audit logs.
              </p>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Audit Logs">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
            <p className="text-muted-foreground">
              Complete audit trail of all system activities and changes
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleExportLogs}>
              <Download className="mr-2 h-4 w-4" />
              Export Logs
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalLogs}</div>
              <p className="text-xs text-muted-foreground">
                All inventory movements
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Inventory Added</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {inventoryLogs.filter(log => log.transaction_type === 'ADD').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Stock increases
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Inventory Reduced</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {inventoryLogs.filter(log => log.transaction_type === 'REDUCE').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Stock decreases
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Adjustments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {inventoryLogs.filter(log => ['TRANSFER', 'ADJUST'].includes(log.transaction_type)).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Transfers & adjustments
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Filter Inventory Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Search products, batches, notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="transaction-type">Transaction Type</Label>
                <Select value={selectedTransactionType} onValueChange={setSelectedTransactionType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSACTION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="time-range">Time Range</Label>
                <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1d">Last 24 hours</SelectItem>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
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
              Detailed record of all inventory movements ({filteredLogs.length} transactions)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
                  <p className="mt-2 text-sm text-muted-foreground">Failed to load inventory logs</p>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Transaction</TableHead>
                    <TableHead>Product & Batch</TableHead>
                    <TableHead>Quantity Change</TableHead>
                    <TableHead>Previous → New</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => {
                    const TransactionIcon = getTransactionIcon(log.transaction_type);
                    
                    return (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">
                                {new Date(log.transaction_date).toLocaleString()}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(log.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <TransactionIcon className="h-4 w-4 text-muted-foreground" />
                            <Badge variant={getTransactionVariant(log.transaction_type)}>
                              {log.transaction_type}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{log.product_name || log.product_id}</div>
                              <div className="text-sm text-muted-foreground">
                                Batch: {log.batch_number || log.batch_id}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className={`font-mono font-medium ${getQuantityChangeColor(log.quantity_change)}`}>
                            {log.quantity_change > 0 ? '+' : ''}{log.quantity_change}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <span className="text-muted-foreground">{log.previous_quantity}</span>
                            <span className="mx-2">→</span>
                            <span className="font-medium">{log.new_quantity}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground max-w-xs truncate">
                            {log.notes || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-muted-foreground font-mono">
                            {log.reference_id || '-'}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredLogs.length === 0 && !isLoading && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="text-center">
                          <Package className="mx-auto h-8 w-8 text-muted-foreground" />
                          <p className="mt-2 text-sm text-muted-foreground">
                            No inventory transactions found for the selected filters.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
