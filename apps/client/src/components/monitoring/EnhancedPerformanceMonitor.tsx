'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity,
  Zap,
  Clock,
  Database,
  Wifi,
  HardDrive,
  Cpu,
  MemoryStick,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  Globe,
  Smartphone,
  Monitor,
} from 'lucide-react';
import {
  usePerformanceMonitoring,
  useInteractionTracking,
  useNetworkMonitoring
} from '@/hooks/usePerformanceMonitoring';

export default function EnhancedPerformanceMonitor() {
  const {
    metrics,
    isLoaded,
    violations,
    budgets,
    reportMetrics
  } = usePerformanceMonitoring();

  const interactions = useInteractionTracking();
  const networkRequests = useNetworkMonitoring();

  if (!isLoaded || !metrics) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-center">
            <Activity className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading performance metrics...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (value: number, threshold: number) => {
    if (value <= threshold * 0.8) return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (value <= threshold) return <TrendingUp className="w-4 h-4 text-yellow-600" />;
    return <XCircle className="w-4 h-4 text-red-600" />;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Enhanced Performance Monitor</h3>
          <p className="text-sm text-muted-foreground">
            Real-time Core Web Vitals and performance metrics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={violations.length > 0 ? 'destructive' : 'default'}>
            {violations.length > 0 ? `${violations.length} Issues` : 'All Good'}
          </Badge>
          <button
            onClick={reportMetrics}
            className="text-sm px-3 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Report Metrics
          </button>
        </div>
      </div>

      {violations.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Performance Budget Violations:</strong>
            <ul className="mt-2 space-y-1">
              {violations.map((violation, index) => (
                <li key={index} className="text-sm">• {violation}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="core-vitals" className="space-y-4">
        <TabsList>
          <TabsTrigger value="core-vitals">Core Web Vitals</TabsTrigger>
          <TabsTrigger value="navigation">Navigation</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="interactions">Interactions</TabsTrigger>
          <TabsTrigger value="network">Network</TabsTrigger>
        </TabsList>

        <TabsContent value="core-vitals" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Largest Contentful Paint */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  {getStatusIcon(metrics.coreWebVitals.lcp, budgets.lcp)}
                  Largest Contentful Paint
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">
                      {formatTime(metrics.coreWebVitals.lcp)}
                    </span>
                    <Badge variant={metrics.coreWebVitals.lcp <= budgets.lcp ? 'default' : 'destructive'}>
                      {metrics.coreWebVitals.lcp <= budgets.lcp ? 'Good' : 'Poor'}
                    </Badge>
                  </div>
                  <Progress
                    value={Math.min((metrics.coreWebVitals.lcp / (budgets.lcp * 2)) * 100, 100)}
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    Target: ≤ {formatTime(budgets.lcp)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* First Input Delay */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  {getStatusIcon(metrics.coreWebVitals.fid, budgets.fid)}
                  First Input Delay
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">
                      {Math.round(metrics.coreWebVitals.fid)}ms
                    </span>
                    <Badge variant={metrics.coreWebVitals.fid <= budgets.fid ? 'default' : 'destructive'}>
                      {metrics.coreWebVitals.fid <= budgets.fid ? 'Good' : 'Poor'}
                    </Badge>
                  </div>
                  <Progress
                    value={Math.min((metrics.coreWebVitals.fid / (budgets.fid * 2)) * 100, 100)}
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    Target: ≤ {budgets.fid}ms
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Cumulative Layout Shift */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  {getStatusIcon(metrics.coreWebVitals.cls * 1000, budgets.cls * 1000)}
                  Cumulative Layout Shift
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">
                      {metrics.coreWebVitals.cls.toFixed(3)}
                    </span>
                    <Badge variant={metrics.coreWebVitals.cls <= budgets.cls ? 'default' : 'destructive'}>
                      {metrics.coreWebVitals.cls <= budgets.cls ? 'Good' : 'Poor'}
                    </Badge>
                  </div>
                  <Progress
                    value={Math.min((metrics.coreWebVitals.cls / (budgets.cls * 2)) * 100, 100)}
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    Target: ≤ {budgets.cls}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* First Contentful Paint */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  {getStatusIcon(metrics.coreWebVitals.fcp, budgets.fcp)}
                  First Contentful Paint
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">
                      {formatTime(metrics.coreWebVitals.fcp)}
                    </span>
                    <Badge variant={metrics.coreWebVitals.fcp <= budgets.fcp ? 'default' : 'destructive'}>
                      {metrics.coreWebVitals.fcp <= budgets.fcp ? 'Good' : 'Poor'}
                    </Badge>
                  </div>
                  <Progress
                    value={Math.min((metrics.coreWebVitals.fcp / (budgets.fcp * 2)) * 100, 100)}
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    Target: ≤ {formatTime(budgets.fcp)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Time to First Byte */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  {getStatusIcon(metrics.coreWebVitals.ttfb, budgets.ttfb)}
                  Time to First Byte
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">
                      {Math.round(metrics.coreWebVitals.ttfb)}ms
                    </span>
                    <Badge variant={metrics.coreWebVitals.ttfb <= budgets.ttfb ? 'default' : 'destructive'}>
                      {metrics.coreWebVitals.ttfb <= budgets.ttfb ? 'Good' : 'Poor'}
                    </Badge>
                  </div>
                  <Progress
                    value={Math.min((metrics.coreWebVitals.ttfb / (budgets.ttfb * 2)) * 100, 100)}
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    Target: ≤ {budgets.ttfb}ms
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Memory Usage */}
            {metrics.memoryUsage && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <MemoryStick className="w-4 h-4" />
                    Memory Usage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">
                        {formatBytes(metrics.memoryUsage.used)}
                      </span>
                      <Badge variant={metrics.memoryUsage.used < metrics.memoryUsage.limit * 0.8 ? 'default' : 'destructive'}>
                        {metrics.memoryUsage.used < metrics.memoryUsage.limit * 0.8 ? 'Good' : 'High'}
                      </Badge>
                    </div>
                    <Progress
                      value={(metrics.memoryUsage.used / metrics.memoryUsage.limit) * 100}
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground">
                      of {formatBytes(metrics.memoryUsage.limit)} total
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="navigation" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Page Load Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatTime(metrics.navigationTiming.loadTime)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  DOM Content Loaded
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatTime(metrics.navigationTiming.domContentLoaded)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  First Paint
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatTime(metrics.navigationTiming.firstPaint)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Connection Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-lg font-bold">
                    {metrics.connectionInfo.effectiveType}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {metrics.connectionInfo.downlink} Mbps
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <HardDrive className="w-4 h-4" />
                  Total Resources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.resourceTiming.totalResources}
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatBytes(metrics.resourceTiming.totalSize)} total size
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Average Load Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatTime(metrics.resourceTiming.totalDuration / Math.max(metrics.resourceTiming.totalResources, 1))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Network Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {networkRequests.length}
                </div>
                <p className="text-sm text-muted-foreground">
                  Tracked requests
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="interactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="w-4 h-4" />
                User Interactions ({interactions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {interactions.slice(-10).map((interaction, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{interaction.type}</Badge>
                      <span className="text-sm">{interaction.target}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {interaction.duration ? `${interaction.duration.toFixed(0)}ms` : 'N/A'}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="network" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Wifi className="w-4 h-4" />
                Recent Network Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {networkRequests.slice(-10).map((request, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{request.method}</Badge>
                      <span className="text-sm font-mono truncate flex-1">
                        {request.url.replace(/^https?:\/\/[^\/]+/, '')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{request.duration.toFixed(0)}ms</span>
                      <span>{formatBytes(request.size)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}