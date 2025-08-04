'use client';

import React, { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { 
  BellIcon, 
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon 
} from '@heroicons/react/24/outline';
import { useAuth } from '@/context/AuthContext';
import clsx from 'clsx';

interface HeaderProps {
  title?: string;
}

export default function Header({ title }: HeaderProps) {
  const { user, logout } = useAuth();

  const userNavigation = [
    { name: 'Your Profile', href: '/profile', icon: UserCircleIcon },
    { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
  ];

  return (
    <header className="bg-white shadow-sm border-b border-neutral-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Page title */}
          <div className="flex-1">
            {title && (
              <h1 className="text-2xl font-semibold text-neutral-900">{title}</h1>
            )}
          </div>

          {/* Right side items */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <button
              type="button"
              className="relative p-2 text-neutral-400 hover:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-full"
            >
              <span className="sr-only">View notifications</span>
              <BellIcon className="h-6 w-6" aria-hidden="true" />
              {/* Notification dot */}
              <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-error-400 ring-2 ring-white" />
            </button>

            {/* User menu */}
            <Menu as="div" className="relative">
              <div>
                <Menu.Button className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
                  <span className="sr-only">Open user menu</span>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-primary-600 font-medium text-sm">
                        {user?.first_name?.[0]?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-medium text-neutral-900">
                        {user?.first_name} {user?.last_name}
                      </p>
                      <p className="text-xs text-neutral-500 capitalize">
                        {user?.role}
                      </p>
                    </div>
                  </div>
                </Menu.Button>
              </div>
              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  {/* User info in mobile */}
                  <div className="px-4 py-2 text-sm text-neutral-500 border-b border-neutral-100 md:hidden">
                    <p className="font-medium text-neutral-900">
                      {user?.first_name} {user?.last_name}
                    </p>
                    <p className="text-xs capitalize">{user?.role}</p>
                    <p className="text-xs">{user?.email}</p>
                  </div>

                  {userNavigation.map((item) => (
                    <Menu.Item key={item.name}>
                      {({ active }) => (
                        <a
                          href={item.href}
                          className={clsx(
                            active ? 'bg-neutral-50' : '',
                            'flex items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50'
                          )}
                        >
                          <item.icon className="mr-3 h-4 w-4 text-neutral-400" />
                          {item.name}
                        </a>
                      )}
                    </Menu.Item>
                  ))}
                  
                  <div className="border-t border-neutral-100">
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={logout}
                          className={clsx(
                            active ? 'bg-neutral-50' : '',
                            'flex w-full items-center px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50'
                          )}
                        >
                          <ArrowRightOnRectangleIcon className="mr-3 h-4 w-4 text-neutral-400" />
                          Sign out
                        </button>
                      )}
                    </Menu.Item>
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>
        </div>
      </div>
    </header>
  );
}
