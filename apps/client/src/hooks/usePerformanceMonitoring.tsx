'use client';

import { useEffect, useState, useCallback } from 'react';

interface CoreWebVitals {
  cls: number; // Cumulative Layout Shift
  fid: number; // First Input Delay
  lcp: number; // Largest Contentful Paint
  fcp: number; // First Contentful Paint
  ttfb: number; // Time to First Byte
}

interface PerformanceMetrics {
  coreWebVitals: CoreWebVitals;
  navigationTiming: {
    loadTime: number;
    domContentLoaded: number;
    firstPaint: number;
    firstContentfulPaint: number;
    largestContentfulPaint: number;
  };
  resourceTiming: {
    totalResources: number;
    totalSize: number;
    totalDuration: number;
  };
  memoryUsage?: {
    used: number;
    total: number;
    limit: number;
  };
  connectionInfo: {
    effectiveType: string;
    rtt: number;
    downlink: number;
  };
}

interface PerformanceBudget {
  cls: number;
  fid: number;
  lcp: number;
  fcp: number;
  ttfb: number;
  bundleSize: number;
  imageSize: number;
}

const DEFAULT_BUDGETS: PerformanceBudget = {
  cls: 0.1,
  fid: 100,
  lcp: 2500,
  fcp: 1800,
  ttfb: 600,
  bundleSize: 500000, // 500KB
  imageSize: 100000, // 100KB
};

export function usePerformanceMonitoring(budgets: Partial<PerformanceBudget> = {}) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [violations, setViolations] = useState<string[]>([]);

  const finalBudgets = { ...DEFAULT_BUDGETS, ...budgets };

  // Core Web Vitals tracking
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();

      entries.forEach((entry) => {
        const metric = entry as any;

        setMetrics(prev => {
          if (!prev) return null;

          const newMetrics = { ...prev };

          switch (entry.entryType) {
            case 'largest-contentful-paint':
              newMetrics.coreWebVitals.lcp = metric.startTime;
              newMetrics.navigationTiming.largestContentfulPaint = metric.startTime;
              break;
            case 'first-input':
              newMetrics.coreWebVitals.fid = metric.processingStart - metric.startTime;
              break;
            case 'layout-shift':
              if (!metric.hadRecentInput) {
                newMetrics.coreWebVitals.cls += metric.value;
              }
              break;
            case 'paint':
              if (metric.name === 'first-contentful-paint') {
                newMetrics.coreWebVitals.fcp = metric.startTime;
                newMetrics.navigationTiming.firstContentfulPaint = metric.startTime;
              }
              break;
          }

          return newMetrics;
        });
      });
    });

    try {
      observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift', 'paint'] });
    } catch (error) {
      console.warn('Performance Observer not supported:', error);
    }

    return () => {
      try {
        observer.disconnect();
      } catch (error) {
        // Ignore disconnect errors
      }
    };
  }, []);

  // Navigation timing and initial metrics
  useEffect(() => {
    if (typeof window === 'undefined' || !window.performance) return;

    const loadInitialMetrics = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paintEntries = performance.getEntriesByType('paint');
      const resourceEntries = performance.getEntriesByType('resource');

      const firstPaint = paintEntries.find(entry => entry.name === 'first-paint')?.startTime || 0;
      const firstContentfulPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0;

      const resourceMetrics = (resourceEntries as PerformanceResourceTiming[]).reduce(
        (acc, entry) => ({
          totalResources: acc.totalResources + 1,
          totalSize: acc.totalSize + (entry.transferSize || 0),
          totalDuration: acc.totalDuration + (entry.duration || 0),
        }),
        { totalResources: 0, totalSize: 0, totalDuration: 0 }
      );

      // Memory usage (Chrome only)
      let memoryUsage;
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        memoryUsage = {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
        };
      }

      // Connection info
      const connection = (navigator as any).connection || {};
      const connectionInfo = {
        effectiveType: connection.effectiveType || 'unknown',
        rtt: connection.rtt || 0,
        downlink: connection.downlink || 0,
      };

      const initialMetrics: PerformanceMetrics = {
        coreWebVitals: {
          cls: 0,
          fid: 0,
          lcp: 0,
          fcp: firstContentfulPaint,
          ttfb: navigation.responseStart - navigation.requestStart,
        },
        navigationTiming: {
          loadTime: navigation.loadEventEnd - navigation.loadEventStart,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          firstPaint,
          firstContentfulPaint,
          largestContentfulPaint: 0,
        },
        resourceTiming: resourceMetrics,
        memoryUsage,
        connectionInfo,
      };

      setMetrics(initialMetrics);
      setIsLoaded(true);
    };

    // Load initial metrics after page load
    if (document.readyState === 'complete') {
      loadInitialMetrics();
      return () => {}; // Return empty cleanup function
    } else {
      window.addEventListener('load', loadInitialMetrics);
      return () => window.removeEventListener('load', loadInitialMetrics);
    }
  }, []);

  // Check for budget violations
  useEffect(() => {
    if (!metrics || !isLoaded) return;

    const newViolations: string[] = [];

    // Check Core Web Vitals against budgets
    if (metrics.coreWebVitals.cls > finalBudgets.cls) {
      newViolations.push(`CLS: ${metrics.coreWebVitals.cls.toFixed(3)} (budget: ${finalBudgets.cls})`);
    }
    if (metrics.coreWebVitals.fid > finalBudgets.fid) {
      newViolations.push(`FID: ${metrics.coreWebVitals.fid.toFixed(0)}ms (budget: ${finalBudgets.fid}ms)`);
    }
    if (metrics.coreWebVitals.lcp > finalBudgets.lcp) {
      newViolations.push(`LCP: ${metrics.coreWebVitals.lcp.toFixed(0)}ms (budget: ${finalBudgets.lcp}ms)`);
    }
    if (metrics.coreWebVitals.fcp > finalBudgets.fcp) {
      newViolations.push(`FCP: ${metrics.coreWebVitals.fcp.toFixed(0)}ms (budget: ${finalBudgets.fcp}ms)`);
    }
    if (metrics.coreWebVitals.ttfb > finalBudgets.ttfb) {
      newViolations.push(`TTFB: ${metrics.coreWebVitals.ttfb.toFixed(0)}ms (budget: ${finalBudgets.ttfb}ms)`);
    }

    // Check memory usage
    if (metrics.memoryUsage && metrics.memoryUsage.used > finalBudgets.bundleSize) {
      newViolations.push(`Memory: ${(metrics.memoryUsage.used / 1024 / 1024).toFixed(1)}MB (high usage)`);
    }

    setViolations(newViolations);
  }, [metrics, isLoaded, finalBudgets]);

  // Report metrics to analytics/monitoring service
  const reportMetrics = useCallback(() => {
    if (!metrics || typeof window === 'undefined') return;

    // Send to analytics service (implement based on your analytics setup)
    const gtag = (window as any).gtag;
    if (gtag) {
      gtag('event', 'performance_metrics', {
        cls: metrics.coreWebVitals.cls,
        fid: metrics.coreWebVitals.fid,
        lcp: metrics.coreWebVitals.lcp,
        fcp: metrics.coreWebVitals.fcp,
        ttfb: metrics.coreWebVitals.ttfb,
      });
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Performance Metrics:', metrics);
      if (violations.length > 0) {
        console.warn('Performance Budget Violations:', violations);
      }
    }
  }, [metrics, violations]);

  // Auto-report on significant changes
  useEffect(() => {
    if (isLoaded) {
      reportMetrics();
    }
  }, [isLoaded, reportMetrics]);

  // Manual trigger for custom reporting
  const triggerReport = useCallback(() => {
    reportMetrics();
  }, [reportMetrics]);

  return {
    metrics,
    isLoaded,
    violations,
    budgets: finalBudgets,
    reportMetrics: triggerReport,
  };
}

// Hook for tracking component performance
export function useComponentPerformance(componentName: string) {
  const [renderCount, setRenderCount] = useState(0);
  const [renderTime, setRenderTime] = useState(0);
  const [lastRenderStart, setLastRenderStart] = useState(0);

  useEffect(() => {
    const startTime = performance.now();
    setLastRenderStart(startTime);
    setRenderCount(prev => prev + 1);

    return () => {
      const endTime = performance.now();
      setRenderTime(endTime - startTime);
    };
  });

  // Track component unmount
  useEffect(() => {
    return () => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`Component ${componentName} unmounted after ${renderCount} renders`);
      }
    };
  }, [componentName, renderCount]);

  return {
    renderCount,
    renderTime,
    lastRenderStart,
  };
}

// Hook for tracking user interactions
export function useInteractionTracking() {
  const [interactions, setInteractions] = useState<Array<{
    type: string;
    timestamp: number;
    duration?: number;
    target?: string;
  }>>([]);

  useEffect(() => {
    const handleInteraction = (event: Event) => {
      const startTime = performance.now();
      const target = event.target as HTMLElement;

      // Track interaction
      const interaction = {
        type: event.type,
        timestamp: Date.now(),
        target: target?.tagName?.toLowerCase() || 'unknown',
      };

      setInteractions(prev => [...prev.slice(-49), interaction]); // Keep last 50 interactions

      // Measure interaction duration for click events
      if (event.type === 'click') {
        setTimeout(() => {
          const duration = performance.now() - startTime;
          setInteractions(prev =>
            prev.map(item =>
              item.timestamp === interaction.timestamp
                ? { ...item, duration }
                : item
            )
          );
        }, 0);
      }
    };

    const events = ['click', 'keydown', 'scroll', 'resize'];
    events.forEach(eventType => {
      window.addEventListener(eventType, handleInteraction, { passive: true });
    });

    return () => {
      events.forEach(eventType => {
        window.removeEventListener(eventType, handleInteraction);
      });
    };
  }, []);

  return interactions;
}

// Hook for tracking network requests
export function useNetworkMonitoring() {
  const [requests, setRequests] = useState<Array<{
    url: string;
    method: string;
    status: number;
    duration: number;
    size: number;
    timestamp: number;
  }>>([]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.performance) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries() as PerformanceResourceTiming[];

      const newRequests = entries.map(entry => ({
        url: entry.name,
        method: 'GET', // Performance API doesn't provide method info
        status: 200, // Performance API doesn't provide status info
        duration: entry.duration,
        size: entry.transferSize || 0,
        timestamp: Date.now(),
      }));

      setRequests(prev => [...prev, ...newRequests].slice(-100)); // Keep last 100 requests
    });

    try {
      observer.observe({ entryTypes: ['resource'] });
    } catch (error) {
      console.warn('Resource timing not supported:', error);
    }

    return () => {
      try {
        observer.disconnect();
      } catch (error) {
        // Ignore disconnect errors
      }
    };
  }, []);

  return requests;
}