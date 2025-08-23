"use client";

import { useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3,
  TrendingUp,
  DollarSign,
  Package,
  Users,
  ShoppingCart,
  AlertTriangle,
  Calendar,
  Download,
  Filter,
  Printer,
  FileText,
  PieChart,
  Activity,
  Archive,
  Clock,
  Target,
  Shield
} from 'lucide-react';
import { usePermissions } from '@/context/AuthContext';

interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  category: 'financial' | 'inventory' | 'operational' | 'compliance';
  badge?: string;
  permission?: boolean;
}

export default function ReportsPage() {
  const { canViewReports, canManageInventory } = usePermissions();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const reportCards: ReportCard[] = [
    // Financial Reports
    {
      id: 'sales-summary',
      title: 'Sales Summary',
      description: 'Revenue, profit, and sales performance analytics',
      icon: DollarSign,
      href: '/reports/sales-summary',
      category: 'financial',
      permission: canViewReports,
    },
    {
      id: 'profit-loss',
      title: 'Profit & Loss',
      description: 'Comprehensive P&L statement with detailed breakdowns',
      icon: TrendingUp,
      href: '/reports/profit-loss',
      category: 'financial',
      permission: canViewReports,
    },
    {
      id: 'financial-dashboard',
      title: 'Financial Dashboard',
      description: 'Real-time financial KPIs and performance metrics',
      icon: BarChart3,
      href: '/reports/financial-dashboard',
      category: 'financial',
      permission: canViewReports,
    },
    {
      id: 'cash-flow',
      title: 'Cash Flow Analysis',
      description: 'Track cash inflows and outflows over time',
      icon: Activity,
      href: '/reports/cash-flow',
      category: 'financial',
      permission: canViewReports,
    },
    
    // Inventory Reports
    {
      id: 'low-stock',
      title: 'Low Stock Alert',
      description: 'Items below minimum stock level requiring attention',
      icon: AlertTriangle,
      href: '/reports/low-stock',
      category: 'inventory',
      badge: 'Alert',
      permission: canManageInventory,
    },
    {
      id: 'expiring-batches',
      title: 'Expiring Batches',
      description: 'Products approaching expiration dates',
      icon: Clock,
      href: '/reports/expiring-batches',
      category: 'inventory',
      badge: 'Urgent',
      permission: canManageInventory,
    },
    {
      id: 'inventory-valuation',
      title: 'Inventory Valuation',
      description: 'Current value of all inventory by category and location',
      icon: Package,
      href: '/reports/inventory-valuation',
      category: 'inventory',
      permission: canViewReports,
    },
    {
      id: 'stock-movement',
      title: 'Stock Movement',
      description: 'Detailed tracking of inventory in/out transactions',
      icon: Archive,
      href: '/reports/stock-movement',
      category: 'inventory',
      permission: canManageInventory,
    },
    {
      id: 'inventory-turnover',
      title: 'Inventory Turnover',
      description: 'Analysis of how quickly inventory is sold and replaced',
      icon: Target,
      href: '/reports/inventory-turnover',
      category: 'inventory',
      permission: canViewReports,
    },
    
    // Operational Reports
    {
      id: 'supplier-performance',
      title: 'Supplier Performance',
      description: 'Evaluate supplier reliability and delivery metrics',
      icon: Users,
      href: '/reports/supplier-performance',
      category: 'operational',
      permission: canViewReports,
    },
    {
      id: 'order-fulfillment',
      title: 'Order Fulfillment',
      description: 'Track order processing times and fulfillment rates',
      icon: ShoppingCart,
      href: '/reports/order-fulfillment',
      category: 'operational',
      permission: canViewReports,
    },
    {
      id: 'operational-efficiency',
      title: 'Operational Efficiency',
      description: 'Key performance indicators for operational processes',
      icon: Activity,
      href: '/reports/operational-efficiency',
      category: 'operational',
      permission: canViewReports,
    },
    
    // Compliance Reports
    {
      id: 'audit-trail',
      title: 'Audit Trail',
      description: 'Complete audit log of all system activities',
      icon: FileText,
      href: '/reports/audit-trail',
      category: 'compliance',
      permission: canViewReports,
    },
    {
      id: 'compliance-summary',
      title: 'Compliance Summary',
      description: 'Regulatory compliance status and requirements',
      icon: Shield,
      href: '/reports/compliance-summary',
      category: 'compliance',
      permission: canViewReports,
    },
  ];

  const categories = [
    { value: 'all', label: 'All Reports' },
    { value: 'financial', label: 'Financial' },
    { value: 'inventory', label: 'Inventory' },
    { value: 'operational', label: 'Operational' },
    { value: 'compliance', label: 'Compliance' },
  ];

  // Filter reports based on permissions, category, and search
  const filteredReports = reportCards.filter(report => {
    if (report.permission === false) return false;
    if (selectedCategory !== 'all' && report.category !== selectedCategory) return false;
    if (searchTerm && !report.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !report.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'financial': return DollarSign;
      case 'inventory': return Package;
      case 'operational': return Activity;
      case 'compliance': return FileText;
      default: return BarChart3;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'financial': return 'text-green-600';
      case 'inventory': return 'text-blue-600';
      case 'operational': return 'text-purple-600';
      case 'compliance': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  // Check permissions
  if (!canViewReports && !canManageInventory) {
    return (
      <DashboardLayout title="Reports">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Access Denied</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                You don't have permission to view reports.
              </p>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Reports">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Reports & Analytics</h1>
            <p className="text-muted-foreground">
              Comprehensive business insights and performance metrics
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export All
            </Button>
            <Button variant="outline" size="sm">
              <Calendar className="mr-2 h-4 w-4" />
              Schedule Reports
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Filter Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search" className="sr-only">Search reports</Label>
                <Input
                  id="search"
                  placeholder="Search reports..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              <div>
                <Label htmlFor="category" className="sr-only">Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports.map((report) => {
            const IconComponent = report.icon;
            const categoryIcon = getCategoryIcon(report.category);
            const CategoryIcon = categoryIcon;
            
            return (
              <Link key={report.id} href={report.href}>
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <IconComponent className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg font-medium">{report.title}</CardTitle>
                          {report.badge && (
                            <Badge variant={report.badge === 'Alert' ? 'destructive' : 'default'} className="mt-1">
                              {report.badge}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <CategoryIcon className={`h-4 w-4 ${getCategoryColor(report.category)}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm">
                      {report.description}
                    </CardDescription>
                    <div className="mt-4 flex items-center text-xs text-muted-foreground">
                      <span className="capitalize">{report.category}</span>
                      <span className="mx-2">•</span>
                      <span>Click to view</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {filteredReports.length === 0 && (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No Reports Found</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Try adjusting your search criteria or category filter.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common reporting tasks and utilities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Button variant="outline" className="h-auto p-4">
                <div className="flex flex-col items-center text-center">
                  <Printer className="h-6 w-6 mb-2" />
                  <span className="font-medium">Print Reports</span>
                  <span className="text-xs text-muted-foreground">Generate printable versions</span>
                </div>
              </Button>
              <Button variant="outline" className="h-auto p-4">
                <div className="flex flex-col items-center text-center">
                  <Calendar className="h-6 w-6 mb-2" />
                  <span className="font-medium">Schedule Reports</span>
                  <span className="text-xs text-muted-foreground">Automate report generation</span>
                </div>
              </Button>
              <Button variant="outline" className="h-auto p-4">
                <div className="flex flex-col items-center text-center">
                  <Download className="h-6 w-6 mb-2" />
                  <span className="font-medium">Export Data</span>
                  <span className="text-xs text-muted-foreground">Download as CSV/PDF</span>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
