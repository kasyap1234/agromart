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
  FileText
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
}

export default function AppSidebar() {
  const pathname = usePathname();
  const { canManageProducts, canManageInventory, canViewReports, canManageUsers } = usePermissions();
  const { user } = useAuth();

  const navigation: NavigationItem[] = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: Home,
      current: pathname === '/dashboard',
    },
    {
      name: 'Products',
      href: '/dashboard/products',
      icon: Package,
      current: pathname?.startsWith('/dashboard/products'),
      permission: canManageProducts,
    },
    {
      name: 'Customers',
      href: '/dashboard/customers',
      icon: Users,
      current: pathname?.startsWith('/dashboard/customers'),
      permission: canManageInventory,
    },
    {
      name: 'Suppliers',
      href: '/dashboard/suppliers',
      icon: Store,
      current: pathname?.startsWith('/dashboard/suppliers'),
      permission: canManageInventory,
    },
    {
      name: 'Purchase Orders',
      href: '/dashboard/purchase-orders',
      icon: ClipboardList,
      current: pathname?.startsWith('/dashboard/purchase-orders'),
      permission: canManageInventory,
    },
    {
      name: 'Sales Orders',
      href: '/dashboard/sales-orders',
      icon: FileText,
      current: pathname?.startsWith('/dashboard/sales-orders'),
      permission: canViewReports,
    },
    {
      name: 'Inventory',
      href: '/dashboard/inventory',
      icon: ClipboardList,
      current: pathname?.startsWith('/dashboard/inventory'),
      permission: canManageInventory,
    },
    {
      name: 'Reports',
      href: '/dashboard/reports',
      icon: BarChart,
      current: pathname?.startsWith('/dashboard/reports'),
      permission: canViewReports,
    },
    {
      name: 'Low Stock Alert',
      href: '/dashboard/reports/low-stock',
      icon: AlertTriangle,
      current: pathname === '/dashboard/reports/low-stock',
      badge: 'Alert',
      permission: canViewReports,
    },
    {
      name: 'Users',
      href: '/dashboard/users',
      icon: Users,
      current: pathname?.startsWith('/dashboard/users'),
      permission: canManageUsers,
    },
    {
      name: 'Settings',
      href: '/dashboard/settings',
      icon: Settings,
      current: pathname?.startsWith('/dashboard/settings'),
    },
  ];

  const filteredNavigation = navigation.filter(item =>
    item.permission === undefined || item.permission
  );

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
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNavigation.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <Link href={item.href as any} className="block">
                    <SidebarMenuButton
                      variant={item.current ? 'active' : 'default'}
                      className="px-3 py-2 text-sm font-medium w-full text-left"
                    >
                      <item.icon className="mr-3 h-5 w-5" />
                      <span>{item.name}</span>
                      {item.badge && (
                        <Badge variant={item.current ? 'default' : 'secondary'} className="ml-auto">
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
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
            <span className="text-primary font-medium text-sm">{user?.name?.[0]?.toUpperCase() || 'U'}</span>
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.name || 'User'}
            </p>
            <p className="text-xs text-muted-foreground truncate capitalize">
              {user?.role || 'user'}
            </p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
