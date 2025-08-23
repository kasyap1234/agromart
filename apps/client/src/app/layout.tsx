import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import { Suspense, lazy } from 'react';
import '@/styles/tailwind-generated.raw.css';

// Lazy load non-critical components for better performance
const ServiceWorker = lazy(() => import('@/components/pwa/ServiceWorker').then(mod => ({ default: mod.ServiceWorker })));
const PerformanceMonitor = lazy(() => import('@/components/monitoring/PerformanceMonitor').then(mod => ({ default: mod.default })));

// Expose CSS variable for Tailwind `fontFamily.sans` to read
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'AgroMart - Inventory Management System',
  description: 'Professional inventory management system for agro-tech companies',
  keywords: 'inventory, agriculture, agro-tech, management, system',
  authors: [{ name: 'AgroMart Team' }],
  robots: 'noindex, nofollow', // Remove this in production
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0ea5e9',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          <Suspense fallback={null}>
            <ServiceWorker />
          </Suspense>
          <Suspense fallback={null}>
            <PerformanceMonitor />
          </Suspense>
          {children}
        </Providers>
      </body>
    </html>
  );
}