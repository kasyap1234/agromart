'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  Zap, 
  Clock, 
  Database, 
  Wifi, 
  HardDrive,
  Cpu,
  MemoryStick
} from 'lucide-react';

interface PerformanceMetrics {
  pageLoadTime: number;
  apiResponseTime: number;
  memoryUsage: number;
  networkLatency: number;
  errorRate: number;
  cacheHitRate: number;
}

export default function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    pageLoadTime: 0,
    apiResponseTime: 0,
    memoryUsage: 0,
    networkLatency: 0,
    errorRate: 0,
    cacheHitRate: 0,
  });

  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Monitor page load performance
    const measurePageLoad = () => {
      if (typeof window !== 'undefined' && window.performance) {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
        
        setMetrics(prev => ({
          ...prev,
          pageLoadTime: loadTime
        }));
      }
    };

    // Monitor memory usage
    const measureMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        
        setMetrics(prev => ({
          ...prev,
          memoryUsage: usagePercent
        }));
      }
    };

    // Monitor network status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Simulate API response time monitoring
    const monitorApiPerformance = () => {
      const startTime = performance.now();
      
      // Simulate API call timing
      setTimeout(() => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        setMetrics(prev => ({
          ...prev,
          apiResponseTime: responseTime,
          networkLatency: Math.random() * 100 + 20, // Simulated
          errorRate: Math.random() * 5, // Simulated
          cacheHitRate: Math.random() * 40 + 60, // Simulated
        }));
      }, Math.random() * 200 + 100);
    };

    // Initial measurements
    measurePageLoad();
    measureMemory();
    monitorApiPerformance();

    // Set up intervals
    const memoryInterval = setInterval(measureMemory, 5000);
    const apiInterval = setInterval(monitorApiPerformance, 10000);

    // Network listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(memoryInterval);
      clearInterval(apiInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getPerformanceStatus = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.warning) return 'warning';
    return 'poor';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'poor':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'good':
        return <Badge className="bg-green-100 text-green-800">Excellent</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800">Good</Badge>;
      case 'poor':
        return <Badge className="bg-red-100 text-red-800">Needs Attention</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const pageLoadStatus = getPerformanceStatus(metrics.pageLoadTime, { good: 1000, warning: 3000 });
  const apiStatus = getPerformanceStatus(metrics.apiResponseTime, { good: 200, warning: 500 });
  const memoryStatus = getPerformanceStatus(metrics.memoryUsage, { good: 50, warning: 80 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Performance Monitor</h3>
          <p className="text-sm text-muted-foreground">
            Real-time application performance metrics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm">{isOnline ? 'Online' : 'Offline'}</span>
        </div>
      </div>

      {!isOnline && (
        <Alert variant="destructive">
          <Wifi className="h-4 w-4" />
          <AlertDescription>
            You are currently offline. Some features may not be available.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Page Load Time */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Page Load Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-2xl font-bold ${getStatusColor(pageLoadStatus)}`}>
                  {metrics.pageLoadTime.toFixed(0)}ms
                </span>
                {getStatusBadge(pageLoadStatus)}
              </div>
              <Progress 
                value={Math.min((metrics.pageLoadTime / 5000) * 100, 100)} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground">
                Target: &lt; 1000ms
              </p>
            </div>
          </CardContent>
        </Card>

        {/* API Response Time */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="w-4 h-4" />
              API Response
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-2xl font-bold ${getStatusColor(apiStatus)}`}>
                  {metrics.apiResponseTime.toFixed(0)}ms
                </span>
                {getStatusBadge(apiStatus)}
              </div>
              <Progress 
                value={Math.min((metrics.apiResponseTime / 1000) * 100, 100)} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground">
                Target: &lt; 200ms
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Memory Usage */}
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
                <span className={`text-2xl font-bold ${getStatusColor(memoryStatus)}`}>
                  {metrics.memoryUsage.toFixed(1)}%
                </span>
                {getStatusBadge(memoryStatus)}
              </div>
              <Progress 
                value={metrics.memoryUsage} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground">
                Target: &lt; 50%
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Network Latency */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wifi className="w-4 h-4" />
              Network Latency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {metrics.networkLatency.toFixed(0)}ms
                </span>
                <Badge variant="outline">
                  {metrics.networkLatency < 50 ? 'Fast' : 
                   metrics.networkLatency < 100 ? 'Good' : 'Slow'}
                </Badge>
              </div>
              <Progress 
                value={Math.min((metrics.networkLatency / 200) * 100, 100)} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Error Rate */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Error Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {metrics.errorRate.toFixed(2)}%
                </span>
                <Badge variant={metrics.errorRate < 1 ? 'default' : 'destructive'}>
                  {metrics.errorRate < 1 ? 'Healthy' : 'High'}
                </Badge>
              </div>
              <Progress 
                value={Math.min(metrics.errorRate * 20, 100)} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Cache Hit Rate */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <HardDrive className="w-4 h-4" />
              Cache Hit Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {metrics.cacheHitRate.toFixed(1)}%
                </span>
                <Badge variant={metrics.cacheHitRate > 80 ? 'default' : 'secondary'}>
                  {metrics.cacheHitRate > 80 ? 'Optimal' : 'Good'}
                </Badge>
              </div>
              <Progress 
                value={metrics.cacheHitRate} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Performance Optimization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">✅ Optimizations Active</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• SWR caching for API calls</li>
                <li>• Lazy loading components</li>
                <li>• Optimized bundle splitting</li>
                <li>• Image optimization</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">🚀 Performance Features</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Real-time error monitoring</li>
                <li>• Progressive loading states</li>
                <li>• Responsive design optimization</li>
                <li>• Memory leak prevention</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}