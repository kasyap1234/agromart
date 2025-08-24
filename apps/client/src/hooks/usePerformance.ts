'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// Performance metrics interface
interface PerformanceMetrics {
  fcp: number | null; // First Contentful Paint
  lcp: number | null; // Largest Contentful Paint
  cls: number | null; // Cumulative Layout Shift
  fid: number | null; // First Input Delay
  ttfb: number | null; // Time to First Byte
}

// Cache configuration
interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum cache size
}

// In-memory cache with TTL
class MemoryCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  set(key: string, data: any, ttl = 5 * 60 * 1000): void { // Default 5 minutes
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Global cache instance
const globalCache = new MemoryCache(200);

// Performance hook
export function usePerformance() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fcp: null,
    lcp: null,
    cls: null,
    fid: null,
    ttfb: null,
  });

  const observerRefs = useRef<{
    lcp?: PerformanceObserver;
    cls?: PerformanceObserver;
    fid?: PerformanceObserver;
  }>({});

  useEffect(() => {
    // First Contentful Paint
    const paintObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          setMetrics(prev => ({ ...prev, fcp: entry.startTime }));
        }
      }
    });

    try {
      paintObserver.observe({ entryTypes: ['paint'] });
    } catch (e) {
      console.warn('Paint observer not supported');
    }

    // Largest Contentful Paint
    try {
      observerRefs.current.lcp = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        setMetrics(prev => ({ ...prev, lcp: lastEntry.startTime }));
      });
      observerRefs.current.lcp.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      console.warn('LCP observer not supported');
    }

    // Cumulative Layout Shift
    try {
      observerRefs.current.cls = new PerformanceObserver((list) => {
        let clsValue = 0;
        for (const entry of list.getEntries()) {
          const layoutShiftEntry = entry as any;
          if (!layoutShiftEntry.hadRecentInput) {
            clsValue += layoutShiftEntry.value;
          }
        }
        setMetrics(prev => ({ ...prev, cls: clsValue }));
      });
      observerRefs.current.cls.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      console.warn('CLS observer not supported');
    }

    // First Input Delay
    try {
      observerRefs.current.fid = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const firstInputEntry = entry as any;
          setMetrics(prev => ({ ...prev, fid: firstInputEntry.processingStart - firstInputEntry.startTime }));
        }
      });
      observerRefs.current.fid.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      console.warn('FID observer not supported');
    }

    // Time to First Byte
    const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    if (navigationEntries.length > 0) {
      const navEntry = navigationEntries[0];
      if (navEntry) {
        const ttfb = navEntry.responseStart - navEntry.requestStart;
        setMetrics(prev => ({ ...prev, ttfb }));
      }
    }

    return () => {
      paintObserver.disconnect();
      Object.values(observerRefs.current).forEach(observer => {
        if (observer) observer.disconnect();
      });
    };
  }, []);

  const reportMetrics = useCallback(() => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      const { fcp, lcp, cls, fid } = metrics;

      // Send to Google Analytics
      (window as any).gtag('event', 'performance_metrics', {
        fcp,
        lcp,
        cls,
        fid,
        ttfb: metrics.ttfb,
      });
    }
  }, [metrics]);

  return { metrics, reportMetrics };
}

// Cache hook
export function useCache(config: CacheConfig = { ttl: 5 * 60 * 1000, maxSize: 100 }) {
  const [cache] = useState(() => new MemoryCache(config.maxSize));

  const get = useCallback((key: string) => {
    return cache.get(key);
  }, [cache]);

  const set = useCallback((key: string, data: any, ttl?: number) => {
    cache.set(key, data, ttl || config.ttl);
  }, [cache, config.ttl]);

  const remove = useCallback((key: string) => {
    cache.delete(key);
  }, [cache]);

  const clear = useCallback(() => {
    cache.clear();
  }, [cache]);

  return { get, set, remove, clear };
}

// Global cache hook
export function useGlobalCache() {
  const get = useCallback((key: string) => {
    return globalCache.get(key);
  }, []);

  const set = useCallback((key: string, data: any, ttl?: number) => {
    globalCache.set(key, data, ttl);
  }, []);

  const remove = useCallback((key: string) => {
    globalCache.delete(key);
  }, []);

  const clear = useCallback(() => {
    globalCache.clear();
  }, []);

  return { get, set, remove, clear, size: globalCache.size() };
}

// API caching hook
export function useApiCache() {
  const { get, set } = useGlobalCache();

  const fetchWithCache = useCallback(async (
    url: string,
    options: RequestInit = {},
    cacheKey?: string,
    ttl = 5 * 60 * 1000 // 5 minutes default
  ) => {
    const key = cacheKey || `api:${url}:${JSON.stringify(options)}`;

    // Check cache first
    const cached = get(key);
    if (cached) {
      return cached;
    }

    // Fetch from API
    const response = await fetch(url, options);
    const data = await response.json();

    // Cache the response
    set(key, data, ttl);

    return data;
  }, [get, set]);

  return { fetchWithCache };
}

// Image optimization hook
export function useImageOptimization() {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const preloadImage = useCallback((src: string) => {
    return new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject();
      img.src = src;
    });
  }, []);

  const getOptimizedImageProps = useCallback((src: string, alt: string, sizes?: string) => {
    return {
      src,
      alt,
      loading: 'lazy' as const,
      decoding: 'async' as const,
      sizes: sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
      onLoad: () => setLoading(prev => ({ ...prev, [src]: false })),
      onError: () => setErrors(prev => ({ ...prev, [src]: true })),
    };
  }, []);

  return {
    loading,
    errors,
    preloadImage,
    getOptimizedImageProps
  };
}