'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  HomeIcon,
  CubeIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  UsersIcon,
  BuildingStorefrontIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { usePermissions } from '@/context/AuthContext';
import clsx from 'clsx';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  current?: boolean;
  badge?: string;
  permission?: () => boolean;
}

export default function Sidebar() {
  const pathname = usePathname();
  const { canManageProducts, canManageInventory, canViewReports, canManageUsers } = usePermissions();

  const navigation: NavigationItem[] = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: HomeIcon,
      current: pathname === '/dashboard',
    },
    {
      name: 'Products',
      href: '/products',
      icon: CubeIcon,
      current: pathname.startsWith('/products'),
      permission: canManageProducts,
    },
    {
      name: 'Inventory',
      href: '/inventory',
      icon: ClipboardDocumentListIcon,
      current: pathname.startsWith('/inventory'),
      permission: canManageInventory,
    },
    {
      name: 'Batches',
      href: '/batches',
      icon: BuildingStorefrontIcon,
      current: pathname.startsWith('/batches'),
      permission: canManageInventory,
    },
    {
      name: 'Reports',
      href: '/reports',
      icon: ChartBarIcon,
      current: pathname.startsWith('/reports'),
      permission: canViewReports,
    },
    {
      name: 'Low Stock',
      href: '/reports/low-stock',
      icon: ExclamationTriangleIcon,
      current: pathname === '/reports/low-stock',
      badge: 'Alert',
      permission: canViewReports,
    },
    {
      name: 'Logs',
      href: '/logs',
      icon: DocumentTextIcon,
      current: pathname.startsWith('/logs'),
      permission: canViewReports,
    },
    {
      name: 'Users',
      href: '/users',
      icon: UsersIcon,
      current: pathname.startsWith('/users'),
      permission: canManageUsers,
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Cog6ToothIcon,
      current: pathname.startsWith('/settings'),
    },
  ];

  const filteredNavigation = navigation.filter(item => 
    !item.permission || item.permission()
  );

  return (
    <div className="flex h-full w-64 flex-col bg-white border-r border-neutral-200">
      {/* Logo */}
      <div className="flex flex-shrink-0 items-center px-6 py-4 border-b border-neutral-200">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <CubeIcon className="w-5 h-5 text-white" />
          </div>
          <div className="ml-3">
            <h1 className="text-xl font-bold text-neutral-900">AgroMart</h1>
            <p className="text-xs text-neutral-500">Inventory System</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {filteredNavigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={clsx(
              item.current
                ? 'bg-primary-50 border-primary-500 text-primary-700'
                : 'border-transparent text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900',
              'group flex items-center px-3 py-2 text-sm font-medium border-l-4 transition-colors duration-200'
            )}
          >
            <item.icon
              className={clsx(
                item.current
                  ? 'text-primary-500'
                  : 'text-neutral-400 group-hover:text-neutral-500',
                'mr-3 flex-shrink-0 h-5 w-5'
              )}
              aria-hidden="true"
            />
            <span className="flex-1">{item.name}</span>
            {item.badge && (
              <span
                className={clsx(
                  item.current
                    ? 'bg-primary-100 text-primary-800'
                    : 'bg-neutral-100 text-neutral-600 group-hover:bg-neutral-200',
                  'ml-3 inline-block py-0.5 px-2 text-xs font-medium rounded-full'
                )}
              >
                {item.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {/* User info at bottom */}
      <div className="flex-shrink-0 border-t border-neutral-200 p-4">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-primary-600 font-medium text-sm">U</span>
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-sm font-medium text-neutral-900 truncate">
              User Account
            </p>
            <p className="text-xs text-neutral-500 truncate">
              Online
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
