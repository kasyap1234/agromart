'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Package,
  ClipboardList,
  BarChart,
  Settings,
  Users,
  Store,
  AlertTriangle,
  FileText,
  Building2,
  ShoppingCart,
  Receipt,
  TruckIcon,
  Boxes,
  UserCheck,
  PieChart,
  Calculator,
  FolderOpen,
  Bell,
  Archive
} from 'lucide-react';
import { usePermissions } from '@/context/AuthContext';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  current?: boolean;
  badge?: string;
  permission?: boolean;
  subItems?: NavigationItem[];
}

interface NavigationGroup {
  name: string;
  items: NavigationItem[];
}

export default function AppSidebar() {
  const pathname = usePathname();
  const {
    canViewProducts,
    canViewInventory,
    canViewCustomers,
    canViewSuppliers,
    canViewLocations,
    canViewPurchaseOrders,
    canViewSalesOrders,
    canViewReports,
    canViewAnalytics,
    canViewLowStockAlerts,
    canViewUsers,
    canViewSettings,
    isAdmin,
    isManager
  } = usePermissions();
  const { user } = useAuth();

  // Define navigation groups with role-based permissions
  const navigationGroups: NavigationGroup[] = [
    {
      name: 'Overview',
      items: [
        {
          name: 'Dashboard',
          href: '/dashboard',
          icon: Home,
          current: pathname === '/dashboard',
          permission: true, // All users can access dashboard
        },
      ],
    },
    {
      name: 'Inventory Management',
      items: [
        {
          name: 'Products',
          href: '/products',
          icon: Package,
          current: pathname?.startsWith('/products'),
          permission: canViewProducts,
        },
        {
          name: 'Inventory',
          href: '/inventory',
          icon: Boxes,
          current: pathname?.startsWith('/inventory'),
          permission: canViewInventory,
        },
        {
          name: 'Batches',
          href: '/batches',
          icon: Archive,
          current: pathname?.startsWith('/batches'),
          permission: canViewInventory,
        },
        {
          name: 'Locations',
          href: '/locations',
          icon: Building2,
          current: pathname?.startsWith('/locations'),
          permission: canViewLocations,
        },
      ],
    },
    {
      name: 'Business Partners',
      items: [
        {
          name: 'Customers',
          href: '/customers',
          icon: Users,
          current: pathname?.startsWith('/customers'),
          permission: canViewCustomers,
        },
        {
          name: 'Suppliers',
          href: '/suppliers',
          icon: TruckIcon,
          current: pathname?.startsWith('/suppliers'),
          permission: canViewSuppliers,
        },
      ],
    },
    {
      name: 'Order Management',
      items: [
        {
          name: 'Purchase Orders',
          href: '/purchase-orders',
          icon: ShoppingCart,
          current: pathname?.startsWith('/purchase-orders'),
          permission: canViewPurchaseOrders,
        },
        {
          name: 'Sales Orders',
          href: '/sales-orders',
          icon: Receipt,
          current: pathname?.startsWith('/sales-orders'),
          permission: canViewSalesOrders,
        },
      ],
    },
    {
      name: 'Analytics & Reports',
      items: [
        {
          name: 'Reports',
          href: '/reports',
          icon: BarChart,
          current: pathname?.startsWith('/reports'),
          permission: canViewReports,
        },
        {
          name: 'Analytics',
          href: '/analytics',
          icon: PieChart,
          current: pathname?.startsWith('/analytics'),
          permission: canViewAnalytics,
        },
        {
          name: 'Low Stock Alerts',
          href: '/reports/low-stock',
          icon: AlertTriangle,
          current: pathname === '/reports/low-stock',
          badge: 'Alert',
          permission: canViewLowStockAlerts,
        },
      ],
    },
    {
      name: 'Administration',
      items: [
        {
          name: 'Users',
          href: '/users',
          icon: UserCheck,
          current: pathname?.startsWith('/users'),
          permission: canViewUsers,
        },
        {
          name: 'Settings',
          href: '/settings',
          icon: Settings,
          current: pathname?.startsWith('/settings'),
          permission: canViewSettings,
        },
      ],
    },
  ];

  // Filter navigation groups and items based on permissions
  const filteredNavigationGroups = navigationGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => item.permission === undefined || item.permission)
    }))
    .filter(group => group.items.length > 0);

  return (
    <Sidebar className="w-64 border-r bg-sidebar text-sidebar-foreground">
      <SidebarHeader className="px-6 py-4 border-b border-sidebar-border">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div className="ml-3">
            <h1 className="text-xl font-bold text-sidebar-foreground">AgroMart</h1>
            <p className="text-xs text-muted-foreground">Inventory System</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-4 py-4">
        {filteredNavigationGroups.map((group) => (
          <SidebarGroup key={group.name} className="mb-6">
            <SidebarGroupLabel className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {group.name}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.name}>
                    <Link href={item.href} className="block">
                      <SidebarMenuButton
                        variant={item.current ? 'active' : 'default'}
                        className="px-3 py-2 text-sm font-medium w-full text-left"
                      >
                        <item.icon className="mr-3 h-5 w-5" />
                        <span>{item.name}</span>
                        {item.badge && (
                          <Badge 
                            variant={item.current ? 'default' : 'secondary'} 
                            className="ml-auto"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
            <span className="text-primary font-medium text-sm">
              {user?.first_name?.[0]?.toUpperCase() || user?.name?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.first_name && user?.last_name 
                ? `${user.first_name} ${user.last_name}`
                : user?.name || 'User'
              }
            </p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground truncate capitalize">
                {user?.role?.toLowerCase() || 'user'}
              </p>
              {(isAdmin || isManager) && (
                <Badge variant="outline" className="text-xs px-1 py-0">
                  {isAdmin ? 'Admin' : 'Manager'}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
