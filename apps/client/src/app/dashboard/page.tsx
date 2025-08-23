import { Suspense } from 'react';
import { Package, AlertTriangle, DollarSign, Clock, RefreshCw } from 'lucide-react';
import DashboardClient from './DashboardClient.tsx';
import DashboardSkeleton from './DashboardSkeleton.tsx';
import { ResponsiveContainer } from '@/components/ui/responsive-container';
import PageContainer from '@/components/layout/PageContainer';
import { apiClient } from '@/lib/api';

// Server Component - handles initial data fetching with caching
async function fetchDashboardData() {
  // During build time, return empty data to avoid API calls
  if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
    return {
      stats: null,
      lowStock: [],
      expiring: [],
      activity: [],
      hasError: false,
    };
  }

  try {
    // Fetch critical data first (stats), then secondary data
    const statsPromise = apiClient.reports.dashboardStats();

    // Use Promise.allSettled for non-critical data to prevent failures from blocking the UI
    const [stats, secondaryData] = await Promise.all([
      statsPromise,
      Promise.allSettled([
        apiClient.reports.lowStock(5),
        apiClient.reports.expiringBatches(5),
        apiClient.auditLogs.list({ limit: 5 }),
      ])
    ]);

    const [lowStockResult, expiringResult, activityResult] = secondaryData;

    return {
      stats: stats || null,
      lowStock: lowStockResult.status === 'fulfilled' ? (lowStockResult.value as any[]) : [],
      expiring: expiringResult.status === 'fulfilled' ? (expiringResult.value as any[]) : [],
      activity: activityResult.status === 'fulfilled' ? (activityResult.value as any[]) : [],
      hasError: secondaryData.some(response => response.status === 'rejected'),
    };
  } catch (error) {
    // Even if stats fail, return empty state instead of crashing
    return {
      stats: null,
      lowStock: [],
      expiring: [],
      activity: [],
      hasError: true,
    };
  }
}

export default async function DashboardPage() {
  // Pre-fetch data on the server
  const initialData = await fetchDashboardData();

  return (
    <ResponsiveContainer variant="padded">
      <PageContainer>
        {/* Header Section - Server Component */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-purple-500/10 p-6 border border-primary/20">
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-purple-600 to-primary bg-clip-text text-transparent">
                  Welcome to AgroMart Dashboard
                </h1>
                <p className="text-muted-foreground mt-2 text-base">
                  Monitor your inventory and business metrics in real-time
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-muted-foreground">System Online</span>
                </div>
              </div>
            </div>
          </div>
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-full blur-3xl -z-10"></div>
        </div>

        <div className="my-6 h-px bg-border"></div>

        {/* Client Component for interactive features */}
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardClient initialData={initialData} />
        </Suspense>
      </PageContainer>
    </ResponsiveContainer>
  );
}
