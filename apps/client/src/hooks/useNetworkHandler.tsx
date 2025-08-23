'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { createNetworkError } from './useErrorHandler';

interface NetworkState {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string;
  lastOnlineAt: Date | null;
  lastOfflineAt: Date | null;
}

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryCondition?: (error: Error, attempt: number) => boolean;
  onRetry?: (error: Error, attempt: number) => void;
}

interface QueuedRequest {
  id: string;
  fn: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  retries: number;
  maxRetries: number;
  timestamp: number;
}

export const useNetworkHandler = () => {
  const [networkState, setNetworkState] = useState<NetworkState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSlowConnection: false,
    connectionType: 'unknown',
    lastOnlineAt: null,
    lastOfflineAt: null,
  });

  const [requestQueue, setRequestQueue] = useState<QueuedRequest[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  // Update network state
  const updateNetworkState = useCallback((updates: Partial<NetworkState>) => {
    setNetworkState(prev => ({
      ...prev,
      ...updates,
      lastOnlineAt: updates.isOnline ? new Date() : prev.lastOnlineAt,
      lastOfflineAt: updates.isOnline === false ? new Date() : prev.lastOfflineAt,
    }));
  }, []);

  // Check connection speed
  const measureConnectionSpeed = useCallback(async (): Promise<boolean> => {
    try {
      const start = Date.now();
      // Use a small image or API call to measure response time
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      const end = Date.now();
      const responseTime = end - start;

      const isSlow = responseTime > 2000; // Consider >2s as slow
      updateNetworkState({ isSlowConnection: isSlow });

      return isSlow;
    } catch {
      updateNetworkState({ isSlowConnection: true });
      return true;
    }
  }, [updateNetworkState]);

  // Enhanced retry mechanism with network awareness
  const retryWithNetworkAwareness = useCallback(async <T,>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> => {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      backoffFactor = 2,
      retryCondition = () => true,
      onRetry,
    } = options;

    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // If offline, queue the request instead of retrying immediately
        if (!networkState.isOnline && attempt === 0) {
          return new Promise((resolve, reject) => {
            const requestId = `${Date.now()}-${Math.random()}`;
            const queuedRequest: QueuedRequest = {
              id: requestId,
              fn,
              resolve,
              reject,
              retries: attempt,
              maxRetries,
              timestamp: Date.now(),
            };

            setRequestQueue(prev => [...prev, queuedRequest]);

            toast.loading('Request queued. Will retry when back online.', {
              id: requestId,
            });
          });
        }

        const result = await fn();
        return result;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry if we've exhausted attempts or condition fails
        if (attempt >= maxRetries || !retryCondition(lastError, attempt)) {
          throw lastError;
        }

        // Calculate delay with exponential backoff
        let delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt), maxDelay);

        // Increase delay for slow connections
        if (networkState.isSlowConnection) {
          delay *= 1.5;
        }

        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 0.3 * delay;
        const totalDelay = delay + jitter;

        if (onRetry) {
          onRetry(lastError, attempt + 1);
        }

        // Show retry toast for user feedback
        if (attempt < maxRetries) {
          toast.loading(
            `Retrying in ${Math.round(totalDelay / 1000)}s... (${attempt + 1}/${maxRetries})`,
            { duration: totalDelay }
          );
        }

        await new Promise(resolve => setTimeout(resolve, totalDelay));
      }
    }

    throw lastError!;
  }, [networkState.isOnline, networkState.isSlowConnection]);

  // Process queued requests when coming back online
  const processQueue = useCallback(async () => {
    if (isProcessingQueue || requestQueue.length === 0 || !networkState.isOnline) {
      return;
    }

    setIsProcessingQueue(true);

    const queue = [...requestQueue];
    setRequestQueue([]);

    for (const request of queue) {
      const { id, fn, resolve, reject, retries, maxRetries } = request;

      toast.dismiss(id);

      if (Date.now() - request.timestamp > 300000) { // 5 minutes timeout
        reject(createNetworkError('Request timed out while offline'));
        continue;
      }

      try {
        const result = await retryWithNetworkAwareness(fn, {
          maxRetries: maxRetries - retries,
          onRetry: (error, attempt) => {
            toast.loading(`Processing queued request... (${attempt}/${maxRetries - retries})`);
          }
        });
        resolve(result);
        toast.success('Queued request completed successfully');
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
        toast.error('Queued request failed');
      }
    }

    setIsProcessingQueue(false);
  }, [isProcessingQueue, requestQueue, networkState.isOnline, retryWithNetworkAwareness]);

  // Network event listeners
  useEffect(() => {
    const handleOnline = () => {
      updateNetworkState({ isOnline: true });
      toast.success('Back online! Processing queued requests...');
      measureConnectionSpeed();
      processQueue();
    };

    const handleOffline = () => {
      updateNetworkState({ isOnline: false });
      toast.error('You appear to be offline. Requests will be queued.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial connection speed check
    if (networkState.isOnline) {
      measureConnectionSpeed();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [updateNetworkState, measureConnectionSpeed, processQueue, networkState.isOnline]);

  // Process queue when network comes back online
  useEffect(() => {
    if (networkState.isOnline && requestQueue.length > 0) {
      processQueue();
    }
  }, [networkState.isOnline, requestQueue.length, processQueue]);

  // Network-aware fetch wrapper
  const networkAwareFetch = useCallback(async <T,>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> => {
    return retryWithNetworkAwareness(
      async () => {
        const response = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'X-Network-Status': networkState.isOnline ? 'online' : 'offline',
            'X-Connection-Type': networkState.connectionType,
          },
        });

        if (!response.ok) {
          throw createNetworkError(
            `HTTP ${response.status}: ${response.statusText}`,
            response.status
          );
        }

        return response.json();
      },
      {
        retryCondition: (error, attempt) => {
          // Don't retry 4xx errors except for specific cases
          const statusCode = (error as any).statusCode;
          if (statusCode && statusCode >= 400 && statusCode < 500) {
            return statusCode === 408 || statusCode === 429; // Timeout or rate limit
          }
          return true;
        },
        onRetry: (error, attempt) => {
          console.log(`Network retry attempt ${attempt} for ${url}:`, error.message);
        },
      }
    );
  }, [retryWithNetworkAwareness, networkState.isOnline, networkState.connectionType]);

  // Connection status indicator component data
  const getConnectionStatus = useCallback(() => {
    if (!networkState.isOnline) {
      return {
        status: 'offline' as const,
        message: 'You are currently offline',
        color: 'destructive' as const,
        icon: '🔴',
      };
    }

    if (networkState.isSlowConnection) {
      return {
        status: 'slow' as const,
        message: 'Slow connection detected',
        color: 'warning' as const,
        icon: '🟡',
      };
    }

    return {
      status: 'online' as const,
      message: 'Connected',
      color: 'success' as const,
      icon: '🟢',
    };
  }, [networkState.isOnline, networkState.isSlowConnection]);

  // Clear request queue
  const clearQueue = useCallback(() => {
    setRequestQueue([]);
    toast.success('Request queue cleared');
  }, []);

  return {
    networkState,
    retryWithNetworkAwareness,
    networkAwareFetch,
    connectionStatus: getConnectionStatus(),
    queueLength: requestQueue.length,
    isProcessingQueue,
    clearQueue,
    measureConnectionSpeed,
  };
};

// Hook for handling API calls with network awareness
export const useNetworkAwareAPI = () => {
  const { retryWithNetworkAwareness, networkState } = useNetworkHandler();

  return useCallback(async <T,>(
    apiCall: () => Promise<T>,
    options: {
      showOfflineToast?: boolean;
      retryOptions?: RetryOptions;
      onSuccess?: (data: T) => void;
      onError?: (error: Error) => void;
    } = {}
  ): Promise<T | null> => {
    const {
      showOfflineToast = true,
      retryOptions = {},
      onSuccess,
      onError,
    } = options;

    if (!networkState.isOnline && showOfflineToast) {
      toast.error('You are currently offline. This request will be queued.');
    }

    try {
      const result = await retryWithNetworkAwareness(apiCall, retryOptions);

      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error));

      if (onError) {
        onError(normalizedError);
      } else {
        toast.error(normalizedError.message || 'Request failed');
      }

      return null;
    }
  }, [retryWithNetworkAwareness, networkState.isOnline]);
};