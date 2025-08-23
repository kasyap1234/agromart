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
      name: 'Suppliers',
      href: '/suppliers',
      icon: Store,
      current: pathname?.startsWith('/suppliers'),
      permission: canManageInventory,
    },
    {
      name: 'Customers',
      href: '/customers',
      icon: Users,
      current: pathname?.startsWith('/customers'),
      permission: canManageInventory,
    },
    {
      name: 'Sales',
      href: '/sales',
      icon: FileText,
      current: pathname?.startsWith('/sales'),
      permission: canViewReports,
    },
    {
      name: 'Purchase Orders',
      href: '/purchase-orders',
      icon: ClipboardList,
      current: pathname?.startsWith('/purchase-orders'),
      permission: canManageInventory,
    },
    {
      name: 'Products',
      href: '/products',
      icon: Package,
      current: pathname?.startsWith('/products'),
      permission: canManageProducts,
    },
    {
      name: 'Inventory',
      href: '/inventory',
      icon: ClipboardList,
      current: pathname?.startsWith('/inventory'),
      permission: canManageInventory,
    },
    {
      name: 'Batches',
      href: '/batches',
      icon: Store,
      current: pathname?.startsWith('/batches'),
      permission: canManageInventory,
    },
    {
      name: 'Reports',
      href: '/reports',
      icon: BarChart,
      current: pathname?.startsWith('/reports'),
      permission: canViewReports,
    },
    {
      name: 'Low Stock',
      href: '/reports/low-stock',
      icon: AlertTriangle,
      current: pathname === '/reports/low-stock',
      badge: 'Alert',
      permission: canViewReports,
    },
    {
      name: 'Logs',
      href: '/logs',
      icon: FileText,
      current: pathname?.startsWith('/logs'),
      permission: canViewReports,
    },
    {
      name: 'Users',
      href: '/users',
      icon: Users,
      current: pathname?.startsWith('/users'),
      permission: canManageUsers,
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
      current: pathname?.startsWith('/settings'),
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
                  <Link href={item.href} className="block">
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
            <span className="text-primary font-medium text-sm">{user?.first_name?.[0]?.toUpperCase() || 'U'}</span>
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-xs text-muted-foreground truncate capitalize">
              {user?.role}
            </p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
