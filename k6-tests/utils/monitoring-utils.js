// k6-tests/utils/monitoring-utils.js
// Monitoring utilities for comprehensive performance tracking

import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { BASE_CONFIG } from '../configs/base-config.js';

// System monitoring metrics
export const systemMetrics = {
  // CPU monitoring
  cpu_usage: new Gauge('system_cpu_usage'),
  cpu_user: new Gauge('system_cpu_user'),
  cpu_system: new Gauge('system_cpu_system'),
  cpu_idle: new Gauge('system_cpu_idle'),

  // Memory monitoring
  memory_used: new Gauge('system_memory_used'),
  memory_free: new Gauge('system_memory_free'),
  memory_total: new Gauge('system_memory_total'),
  memory_usage_percent: new Gauge('system_memory_usage_percent'),

  // Database monitoring
  db_connections_active: new Gauge('db_connections_active'),
  db_connections_idle: new Gauge('db_connections_idle'),
  db_connections_total: new Gauge('db_connections_total'),
  db_query_duration: new Trend('db_query_duration'),
  db_connection_pool_utilization: new Gauge('db_connection_pool_utilization'),

  // Cache monitoring
  cache_hits: new Counter('cache_hits'),
  cache_misses: new Counter('cache_misses'),
  cache_hit_rate: new Rate('cache_hit_rate'),
  cache_size: new Gauge('cache_size'),
  cache_evictions: new Counter('cache_evictions'),

  // Application monitoring
  app_active_users: new Gauge('app_active_users'),
  app_requests_per_second: new Rate('app_requests_per_second'),
  app_response_time: new Trend('app_response_time'),
  app_error_rate: new Rate('app_error_rate'),
  app_memory_heap_used: new Gauge('app_memory_heap_used'),
  app_memory_heap_total: new Gauge('app_memory_heap_total'),
  app_gc_collections: new Counter('app_gc_collections'),
  app_gc_pause_duration: new Trend('app_gc_pause_duration'),
};

/**
 * Monitor system resources during test execution
 */
export class SystemMonitor {
  constructor() {
    this.monitoringInterval = null;
    this.isMonitoring = false;
  }

  /**
   * Start system monitoring
   */
  startMonitoring(intervalMs = 5000) {
    if (this.isMonitoring) {
      console.log('System monitoring is already running');
      return;
    }

    this.isMonitoring = true;
    console.log(`Starting system monitoring with ${intervalMs}ms interval`);

    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, intervalMs);
  }

  /**
   * Stop system monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('System monitoring stopped');
  }

  /**
   * Collect current system metrics
   */
  async collectSystemMetrics() {
    try {
      // Simulate system metrics collection
      // In a real scenario, you would collect from actual system APIs

      // CPU metrics (simulated)
      const cpuUsage = Math.random() * 100;
      systemMetrics.cpu_usage.add(cpuUsage);

      if (cpuUsage > BASE_CONFIG.TARGETS.CPU_USAGE_MAX) {
        console.warn(`High CPU usage detected: ${cpuUsage.toFixed(2)}%`);
      }

      // Memory metrics (simulated)
      const memoryUsage = 50 + Math.random() * 40; // 50-90%
      systemMetrics.memory_usage_percent.add(memoryUsage);

      if (memoryUsage > BASE_CONFIG.TARGETS.MEMORY_USAGE_MAX) {
        console.warn(`High memory usage detected: ${memoryUsage.toFixed(2)}%`);
      }

      // Database metrics (simulated)
      const dbConnections = Math.floor(Math.random() * 50) + 10;
      systemMetrics.db_connections_active.add(dbConnections);

      // Cache metrics (simulated)
      const cacheHitRate = 0.7 + Math.random() * 0.3; // 70-100%
      systemMetrics.cache_hit_rate.add(cacheHitRate);

      if (cacheHitRate < 0.5) {
        console.warn(`Low cache hit rate detected: ${(cacheHitRate * 100).toFixed(2)}%`);
      }

      // Application metrics (simulated)
      const activeUsers = Math.floor(__VU * (0.8 + Math.random() * 0.4));
      systemMetrics.app_active_users.add(activeUsers);

    } catch (error) {
      console.error('Error collecting system metrics:', error);
    }
  }

  /**
   * Get current system status
   */
  getSystemStatus() {
    return {
      timestamp: Date.now(),
      isMonitoring: this.isMonitoring,
      metrics: {
        // These would be actual current values in a real implementation
        cpu: 'simulated',
        memory: 'simulated',
        database: 'simulated',
        cache: 'simulated',
        application: 'simulated',
      },
    };
  }
}

// Performance monitoring utilities
export class PerformanceMonitor {
  constructor() {
    this.performanceData = [];
    this.thresholdViolations = [];
  }

  /**
   * Track performance metric
   */
  trackMetric(name, value, threshold = null) {
    const metric = {
      timestamp: Date.now(),
      name,
      value,
      threshold,
      violated: threshold ? value > threshold : false,
    };

    this.performanceData.push(metric);

    if (metric.violated) {
      this.thresholdViolations.push(metric);
      console.warn(`Performance threshold violated: ${name} = ${value} (threshold: ${threshold})`);
    }

    return metric;
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const summary = {
      totalMetrics: this.performanceData.length,
      thresholdViolations: this.thresholdViolations.length,
      violationRate: this.thresholdViolations.length / Math.max(this.performanceData.length, 1),
      violationsByType: {},
    };

    // Group violations by metric type
    this.thresholdViolations.forEach(violation => {
      if (!summary.violationsByType[violation.name]) {
        summary.violationsByType[violation.name] = [];
      }
      summary.violationsByType[violation.name].push(violation);
    });

    return summary;
  }

  /**
   * Export performance data
   */
  exportPerformanceData() {
    return {
      performanceData: this.performanceData,
      thresholdViolations: this.thresholdViolations,
      summary: this.getPerformanceSummary(),
      exportTime: Date.now(),
    };
  }

  /**
   * Reset monitoring data
   */
  reset() {
    this.performanceData = [];
    this.thresholdViolations = [];
  }
}

/**
 * Database performance monitoring
 */
export class DatabaseMonitor {
  constructor(httpUtils) {
    this.httpUtils = httpUtils;
    this.queryMetrics = [];
  }

  /**
   * Monitor database query performance
   */
  async monitorQuery(endpoint, queryType = 'unknown') {
    const startTime = Date.now();

    try {
      // This would be replaced with actual database monitoring calls
      const response = await this.httpUtils.get(endpoint);
      const duration = Date.now() - startTime;

      const queryMetric = {
        timestamp: Date.now(),
        endpoint,
        queryType,
        duration,
        success: response.status === 200,
        status: response.status,
      };

      this.queryMetrics.push(queryMetric);
      systemMetrics.db_query_duration.add(duration);

      // Check for slow queries
      if (duration > 1000) { // 1 second threshold
        console.warn(`Slow database query detected: ${endpoint} took ${duration}ms`);
      }

      return queryMetric;

    } catch (error) {
      const duration = Date.now() - startTime;

      const queryMetric = {
        timestamp: Date.now(),
        endpoint,
        queryType,
        duration,
        success: false,
        error: error.message,
      };

      this.queryMetrics.push(queryMetric);
      return queryMetric;
    }
  }

  /**
   * Get database performance summary
   */
  getDatabaseSummary() {
    const totalQueries = this.queryMetrics.length;
    const successfulQueries = this.queryMetrics.filter(q => q.success).length;
    const failedQueries = totalQueries - successfulQueries;
    const avgQueryTime = this.queryMetrics.reduce((sum, q) => sum + q.duration, 0) / Math.max(totalQueries, 1);
    const slowQueries = this.queryMetrics.filter(q => q.duration > 1000);

    return {
      totalQueries,
      successfulQueries,
      failedQueries,
      successRate: successfulQueries / Math.max(totalQueries, 1),
      avgQueryTime,
      slowQueries: slowQueries.length,
      slowQueryRate: slowQueries.length / Math.max(totalQueries, 1),
      queryMetrics: this.queryMetrics,
    };
  }
}

/**
 * Cache performance monitoring
 */
export class CacheMonitor {
  constructor() {
    this.cacheOperations = [];
  }

  /**
   * Track cache operation
   */
  trackCacheOperation(operation, key, hit = false, duration = 0) {
    const cacheOp = {
      timestamp: Date.now(),
      operation,
      key,
      hit,
      duration,
    };

    this.cacheOperations.push(cacheOp);

    if (hit) {
      systemMetrics.cache_hits.add(1);
    } else {
      systemMetrics.cache_misses.add(1);
    }

    return cacheOp;
  }

  /**
   * Get cache performance summary
   */
  getCacheSummary() {
    const totalOperations = this.cacheOperations.length;
    const hits = this.cacheOperations.filter(op => op.hit).length;
    const misses = totalOperations - hits;
    const hitRate = hits / Math.max(totalOperations, 1);

    const operationsByType = {};
    this.cacheOperations.forEach(op => {
      if (!operationsByType[op.operation]) {
        operationsByType[op.operation] = [];
      }
      operationsByType[op.operation].push(op);
    });

    return {
      totalOperations,
      hits,
      misses,
      hitRate,
      operationsByType,
      cacheOperations: this.cacheOperations,
    };
  }

  /**
   * Reset cache monitoring data
   */
  reset() {
    this.cacheOperations = [];
  }
}

// Export singleton instances
export const systemMonitor = new SystemMonitor();
export const performanceMonitor = new PerformanceMonitor();
export const databaseMonitor = new DatabaseMonitor();
export const cacheMonitor = new CacheMonitor();

// Export utility functions
export function startComprehensiveMonitoring(intervalMs = 5000) {
  console.log('Starting comprehensive monitoring...');
  systemMonitor.startMonitoring(intervalMs);
  performanceMonitor.reset();
  databaseMonitor.queryMetrics = [];
  cacheMonitor.reset();
}

export function stopComprehensiveMonitoring() {
  console.log('Stopping comprehensive monitoring...');
  systemMonitor.stopMonitoring();
}

export function generateMonitoringReport() {
  return {
    timestamp: Date.now(),
    systemStatus: systemMonitor.getSystemStatus(),
    performanceSummary: performanceMonitor.getPerformanceSummary(),
    databaseSummary: databaseMonitor.getDatabaseSummary(),
    cacheSummary: cacheMonitor.getCacheSummary(),
  };
}