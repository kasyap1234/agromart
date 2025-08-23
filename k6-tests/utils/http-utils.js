// k6-tests/utils/http-utils.js
// HTTP utilities for k6 load testing

import http from 'k6/http';
import { check } from 'k6';
import { BASE_CONFIG } from '../configs/base-config.js';

// Custom metrics for detailed monitoring
export const customMetrics = {
  auth_duration: new Trend('auth_duration'),
  product_operations_duration: new Trend('product_operations_duration'),
  dashboard_load_duration: new Trend('dashboard_load_duration'),
  file_upload_duration: new Trend('file_upload_duration'),
  database_query_duration: new Trend('database_query_duration'),
  cache_hit_rate: new Rate('cache_hit_rate'),
  cpu_usage: new Gauge('cpu_usage'),
  memory_usage: new Gauge('memory_usage'),
};

/**
 * Enhanced HTTP request wrapper with comprehensive error handling and metrics
 */
export class HttpUtils {
  constructor(baseURL = BASE_CONFIG.API_BASE_URL) {
    this.baseURL = baseURL;
    this.authToken = null;
  }

  /**
   * Set authentication token for subsequent requests
   */
  setAuthToken(token) {
    this.authToken = token;
  }

  /**
   * Get default headers with optional authentication
   */
  getDefaultHeaders(includeAuth = true) {
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'k6-load-test/1.0',
    };

    if (includeAuth && this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * Enhanced POST request with metrics and error handling
   */
  post(endpoint, payload = null, params = {}, metricName = null) {
    const url = `${this.baseURL}${endpoint}`;
    const requestParams = {
      ...params,
      headers: { ...this.getDefaultHeaders(), ...params.headers },
      timeout: BASE_CONFIG.HTTP.timeout,
    };

    const startTime = Date.now();
    const response = http.post(url, payload, requestParams);
    const duration = Date.now() - startTime;

    // Track custom metrics
    if (metricName && customMetrics[metricName]) {
      customMetrics[metricName].add(duration);
    }

    // Enhanced response validation
    const result = check(response, {
      [`${endpoint} status is 200`]: (r) => r.status === 200,
      [`${endpoint} status is 201`]: (r) => r.status === 201,
      [`${endpoint} response time < 1.5s`]: (r) => r.timings.duration < BASE_CONFIG.TARGETS.RESPONSE_TIME_P95,
      [`${endpoint} response time < 3s`]: (r) => r.timings.duration < BASE_CONFIG.TARGETS.RESPONSE_TIME_P99,
    });

    if (!result) {
      console.error(`Request failed: ${endpoint}, Status: ${response.status}, Duration: ${duration}ms`);
    }

    return response;
  }

  /**
   * Enhanced GET request with metrics and error handling
   */
  get(endpoint, params = {}, metricName = null) {
    const url = `${this.baseURL}${endpoint}`;
    const requestParams = {
      ...params,
      headers: { ...this.getDefaultHeaders(), ...params.headers },
      timeout: BASE_CONFIG.HTTP.timeout,
    };

    const startTime = Date.now();
    const response = http.get(url, requestParams);
    const duration = Date.now() - startTime;

    // Track custom metrics
    if (metricName && customMetrics[metricName]) {
      customMetrics[metricName].add(duration);
    }

    // Enhanced response validation
    const result = check(response, {
      [`${endpoint} status is 200`]: (r) => r.status === 200,
      [`${endpoint} response time < 1.5s`]: (r) => r.timings.duration < BASE_CONFIG.TARGETS.RESPONSE_TIME_P95,
      [`${endpoint} response time < 3s`]: (r) => r.timings.duration < BASE_CONFIG.TARGETS.RESPONSE_TIME_P99,
    });

    if (!result) {
      console.error(`Request failed: ${endpoint}, Status: ${response.status}, Duration: ${duration}ms`);
    }

    return response;
  }

  /**
   * Enhanced PUT request with metrics and error handling
   */
  put(endpoint, payload = null, params = {}, metricName = null) {
    const url = `${this.baseURL}${endpoint}`;
    const requestParams = {
      ...params,
      headers: { ...this.getDefaultHeaders(), ...params.headers },
      timeout: BASE_CONFIG.HTTP.timeout,
    };

    const startTime = Date.now();
    const response = http.put(url, payload, requestParams);
    const duration = Date.now() - startTime;

    // Track custom metrics
    if (metricName && customMetrics[metricName]) {
      customMetrics[metricName].add(duration);
    }

    // Enhanced response validation
    const result = check(response, {
      [`${endpoint} status is 200`]: (r) => r.status === 200,
      [`${endpoint} response time < 1.5s`]: (r) => r.timings.duration < BASE_CONFIG.TARGETS.RESPONSE_TIME_P95,
      [`${endpoint} response time < 3s`]: (r) => r.timings.duration < BASE_CONFIG.TARGETS.RESPONSE_TIME_P99,
    });

    if (!result) {
      console.error(`Request failed: ${endpoint}, Status: ${response.status}, Duration: ${duration}ms`);
    }

    return response;
  }

  /**
   * Enhanced DELETE request with metrics and error handling
   */
  delete(endpoint, params = {}, metricName = null) {
    const url = `${this.baseURL}${endpoint}`;
    const requestParams = {
      ...params,
      headers: { ...this.getDefaultHeaders(), ...params.headers },
      timeout: BASE_CONFIG.HTTP.timeout,
    };

    const startTime = Date.now();
    const response = http.del(url, requestParams);
    const duration = Date.now() - startTime;

    // Track custom metrics
    if (metricName && customMetrics[metricName]) {
      customMetrics[metricName].add(duration);
    }

    // Enhanced response validation
    const result = check(response, {
      [`${endpoint} status is 200`]: (r) => r.status === 200,
      [`${endpoint} status is 204`]: (r) => r.status === 204,
      [`${endpoint} response time < 1.5s`]: (r) => r.timings.duration < BASE_CONFIG.TARGETS.RESPONSE_TIME_P95,
      [`${endpoint} response time < 3s`]: (r) => r.timings.duration < BASE_CONFIG.TARGETS.RESPONSE_TIME_P99,
    });

    if (!result) {
      console.error(`Request failed: ${endpoint}, Status: ${response.status}, Duration: ${duration}ms`);
    }

    return response;
  }

  /**
   * File upload utility with performance tracking
   */
  uploadFile(endpoint, fileData, fileName, params = {}) {
    const url = `${this.baseURL}${endpoint}`;

    const boundary = `----k6Boundary${Math.random().toString(36).substring(2)}`;
    const body = `--${boundary}\r\n` +
                 `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
                 `Content-Type: application/octet-stream\r\n\r\n` +
                 `${fileData}\r\n` +
                 `--${boundary}--\r\n`;

    const requestParams = {
      ...params,
      headers: {
        ...this.getDefaultHeaders(),
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        ...params.headers,
      },
      timeout: '60s', // Longer timeout for file uploads
    };

    const startTime = Date.now();
    const response = http.post(url, body, requestParams);
    const duration = Date.now() - startTime;

    // Track file upload metrics
    customMetrics.file_upload_duration.add(duration);

    const result = check(response, {
      [`${endpoint} file upload status is 200`]: (r) => r.status === 200,
      [`${endpoint} file upload status is 201`]: (r) => r.status === 201,
      [`${endpoint} file upload time < 10s`]: (r) => r.timings.duration < 10000,
    });

    if (!result) {
      console.error(`File upload failed: ${endpoint}, Status: ${response.status}, Duration: ${duration}ms`);
    }

    return response;
  }
}

// Export singleton instance
export const httpUtils = new HttpUtils();

// Export individual components for advanced usage
export { http };
export { check };
export { Trend, Rate, Gauge } from 'k6/metrics';