'use client';

import React, { useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  timestamp: string;
  url: string;
  userAgent: string;
  componentStack?: string;
}

interface ErrorOptions {
  showToast?: boolean;
  logError?: boolean;
  redirectTo?: string;
  fallbackMessage?: string;
  context?: Partial<ErrorContext>;
}

interface NetworkError extends Error {
  code?: string;
  status?: number;
  isNetworkError?: boolean;
  isRetryable?: boolean;
}

// Custom error types
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly context?: ErrorContext;
  public readonly isRetryable: boolean;
  public readonly category: 'network' | 'validation' | 'auth' | 'business' | 'system';

  constructor(
    message: string,
    code: string,
    category: 'network' | 'validation' | 'auth' | 'business' | 'system',
    options?: {
      statusCode?: number;
      context?: ErrorContext;
      isRetryable?: boolean;
      cause?: Error;
    }
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.category = category;
    this.statusCode = options?.statusCode;
    this.context = options?.context;
    this.isRetryable = options?.isRetryable ?? true;
    this.cause = options?.cause;

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

// Common error factory functions
export const createNetworkError = (message: string, statusCode?: number, cause?: Error): AppError =>
  new AppError(message, 'NETWORK_ERROR', 'network', {
    statusCode,
    isRetryable: true,
    cause
  });

export const createValidationError = (message: string, field?: string): AppError =>
  new AppError(message, `VALIDATION_ERROR${field ? `_${field.toUpperCase()}` : ''}`, 'validation', {
    isRetryable: false
  });

export const createAuthError = (message: string, code: string = 'AUTH_ERROR'): AppError =>
  new AppError(message, code, 'auth', {
    statusCode: 401,
    isRetryable: false
  });

export const createBusinessError = (message: string, code: string): AppError =>
  new AppError(message, code, 'business', {
    isRetryable: false
  });

export const createSystemError = (message: string, cause?: Error): AppError =>
  new AppError(message, 'SYSTEM_ERROR', 'system', {
    isRetryable: true,
    cause
  });

// Main error handler hook
export const useErrorHandler = () => {
  const router = useRouter();

  // Enhanced error logging
  const logError = useCallback((error: Error | AppError, context?: Partial<ErrorContext>) => {
    const errorContext: ErrorContext = {
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
      ...context,
    };

    const errorDetails = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: (error as AppError).code,
      category: (error as AppError).category,
      statusCode: (error as AppError).statusCode,
      isRetryable: (error as AppError).isRetryable,
      context: errorContext,
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Handler');
      console.error('Error:', error);
      console.error('Details:', errorDetails);
      console.groupEnd();
    }

    // In production, you would send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error reporting service
      // errorReportingService.captureException(error, { extra: errorDetails });
      console.error('Production Error:', errorDetails);
    }

    // Store error in session storage for debugging
    try {
      const existingErrors = JSON.parse(sessionStorage.getItem('app_errors') || '[]');
      existingErrors.push({
        ...errorDetails,
        timestamp: new Date().toISOString(),
      });
      // Keep only last 10 errors
      if (existingErrors.length > 10) {
        existingErrors.splice(0, existingErrors.length - 10);
      }
      sessionStorage.setItem('app_errors', JSON.stringify(existingErrors));
    } catch (storageError) {
      console.warn('Failed to store error in session storage:', storageError);
    }
  }, []);

  // Handle different error types
  const handleError = useCallback((
    error: Error | AppError | NetworkError | unknown,
    options: ErrorOptions = {}
  ) => {
    const {
      showToast = true,
      logError: shouldLogError = true,
      redirectTo,
      fallbackMessage = 'An unexpected error occurred',
      context,
    } = options;

    // Normalize error object
    const normalizedError = error instanceof Error ? error : new Error(String(error));

    // Log error if requested
    if (shouldLogError) {
      logError(normalizedError, context);
    }

    // Handle AppError instances
    if (error instanceof AppError) {
      switch (error.category) {
        case 'network':
          if (showToast) {
            toast.error(error.message || 'Network error occurred');
          }
          break;
        case 'validation':
          if (showToast) {
            toast.error(error.message || 'Validation error');
          }
          break;
        case 'auth':
          if (showToast) {
            toast.error(error.message || 'Authentication error');
          }
          if (redirectTo || error.statusCode === 401) {
            // Clear auth tokens and redirect
            if (typeof window !== 'undefined') {
              localStorage.removeItem('auth_token');
              sessionStorage.removeItem('user');
              router.push(redirectTo || '/auth/login');
            }
          }
          break;
        case 'business':
          if (showToast) {
            toast.error(error.message || 'Business logic error');
          }
          break;
        case 'system':
          if (showToast) {
            toast.error(error.message || 'System error occurred');
          }
          break;
        default:
          if (showToast) {
            toast.error(error.message || fallbackMessage);
          }
      }
      return;
    }

    // Handle network errors
    if ((error as NetworkError).isNetworkError || error instanceof TypeError && error.message.includes('fetch')) {
      const networkError = createNetworkError(
        (error as NetworkError).status === 0
          ? 'Network connection lost. Please check your internet connection.'
          : 'Network error occurred. Please try again.',
        (error as NetworkError).status,
        normalizedError
      );

      if (showToast) {
        toast.error(networkError.message);
      }
      return;
    }

    // Handle generic errors
    if (showToast) {
      toast.error(normalizedError.message || fallbackMessage);
    }
  }, [logError, router]);

  // Retry mechanism with exponential backoff
  const retryWithBackoff = useCallback(async <T,>(
    fn: () => Promise<T>,
    options: {
      maxRetries?: number;
      baseDelay?: number;
      maxDelay?: number;
      onRetry?: (attempt: number, error: Error) => void;
    } = {}
  ): Promise<T> => {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      onRetry,
    } = options;

    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === maxRetries) {
          throw lastError;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        const jitter = Math.random() * 0.3 * delay; // 30% jitter
        const totalDelay = delay + jitter;

        if (onRetry) {
          onRetry(attempt + 1, lastError);
        }

        await new Promise(resolve => setTimeout(resolve, totalDelay));
      }
    }

    throw lastError!;
  }, []);

  // Handle unhandled promise rejections
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));

      handleError(error, {
        context: { action: 'unhandled_promise_rejection' },
        fallbackMessage: 'An unexpected error occurred in the background',
      });

      // Prevent default browser error handling
      event.preventDefault();
    };

    const handleUnhandledError = (event: ErrorEvent) => {
      handleError(event.error || new Error(event.message), {
        context: {
          action: 'unhandled_error',
          component: 'global_error_handler'
        },
        fallbackMessage: 'An unexpected error occurred',
      });

      // Only prevent default in development to avoid breaking error overlay
      if (process.env.NODE_ENV === 'production') {
        event.preventDefault();
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleUnhandledError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleUnhandledError);
    };
  }, [handleError]);

  // Network status monitoring
  const [isOnline, setIsOnline] = React.useState(true);
  const [networkStatus, setNetworkStatus] = React.useState<'online' | 'offline' | 'slow'>('online');

  useEffect(() => {
    const updateOnlineStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);

      if (!online) {
        toast.error('You appear to be offline. Some features may not work properly.');
        setNetworkStatus('offline');
      } else {
        setNetworkStatus('online');
        toast.success('Back online!');
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  return {
    handleError,
    retryWithBackoff,
    logError,
    isOnline,
    networkStatus,
    // Error constructors for convenience
    createNetworkError,
    createValidationError,
    createAuthError,
    createBusinessError,
    createSystemError,
  };
};

// Hook for handling async operations with error handling
export const useAsyncErrorHandler = () => {
  const { handleError, retryWithBackoff } = useErrorHandler();

  return useCallback(async <T,>(
    asyncFn: () => Promise<T>,
    options: {
      onSuccess?: (data: T) => void;
      onError?: (error: Error) => void;
      retryOptions?: Parameters<typeof retryWithBackoff>[1];
      errorOptions?: ErrorOptions;
      loadingMessage?: string;
    } = {}
  ): Promise<T | null> => {
    const {
      onSuccess,
      onError,
      retryOptions,
      errorOptions = {},
      loadingMessage,
    } = options;

    try {
      const toastId = loadingMessage ? toast.loading(loadingMessage) : null;

      const result = retryOptions
        ? await retryWithBackoff(asyncFn, retryOptions)
        : await asyncFn();

      if (toastId) {
        toast.dismiss(toastId);
      }

      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (error) {
      if (onError) {
        onError(error instanceof Error ? error : new Error(String(error)));
      } else {
        handleError(error, errorOptions);
      }

      return null;
    }
  }, [handleError, retryWithBackoff]);
};

// Utility hook for form error handling
export const useFormErrorHandler = () => {
  const { handleError } = useErrorHandler();

  return useCallback((error: any, field?: string) => {
    if (typeof error === 'string') {
      return handleError(createValidationError(error, field));
    }

    if (error instanceof Error) {
      return handleError(error);
    }

    // Handle validation libraries like Zod
    if (error && typeof error === 'object' && 'issues' in error) {
      const issues = (error as any).issues;
      if (Array.isArray(issues) && issues.length > 0) {
        return handleError(createValidationError(issues[0].message, issues[0].path?.[0]));
      }
    }

    return handleError(createValidationError('Invalid input', field));
  }, [handleError]);
};