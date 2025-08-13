import React from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'padded' | 'full' | 'centered';
}

export function ResponsiveContainer({ 
  children, 
  className = '', 
  variant = 'default' 
}: ResponsiveContainerProps) {
  const baseClasses = 'w-full';
  
  const variantClasses = {
    default: 'container mx-auto px-4 sm:px-6 lg:px-8',
    padded: 'container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12',
    full: 'w-full',
    centered: 'container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center min-h-[50vh]'
  };

  return (
    <div className={cn(baseClasses, variantClasses[variant], className)}>
      {children}
    </div>
  );
}

export default ResponsiveContainer;