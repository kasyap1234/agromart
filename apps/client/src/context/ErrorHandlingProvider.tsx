'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { useErrorHandler, useAsyncErrorHandler, useFormErrorHandler } from '@/hooks/useErrorHandler';
import { useNetworkHandler } from '@/hooks/useNetworkHandler';
import { usePWAInstall } from '@/components/pwa/OfflineFallback';
import { OfflineFallback } from '@/components/pwa/OfflineFallback';
import { LoadingFallback, NetworkErrorFallback } from '@/components/ui/loading-fallback';
import { Toaster } from 'react-hot-toast';

interface ErrorHandlingContextType {
  // Error handlers
  handleError: ReturnType<typeof useErrorHandler>['handleError'];
  retryWithBackoff: ReturnType<typeof useErrorHandler>['retryWithBackoff'];
  logError: ReturnType<typeof useErrorHandler>['logError'];
  handleAsync: ReturnType<typeof useAsyncErrorHandler>;
  handleFormError: ReturnType<typeof useFormErrorHandler>;

  // Network handling
  networkState: ReturnType<typeof useNetworkHandler>['networkState'];
  retryWithNetworkAwareness: ReturnType<typeof useNetworkHandler>['retryWithNetworkAwareness'];
  networkAwareFetch: ReturnType<typeof useNetworkHandler>['networkAwareFetch'];
  connectionStatus: ReturnType<typeof useNetworkHandler>['connectionStatus'];

  // PWA
  canInstall: ReturnType<typeof usePWAInstall>['canInstall'];
  isInstalled: ReturnType<typeof usePWAInstall>['isInstalled'];
  installApp: ReturnType<typeof usePWAInstall>['installApp'];

  // Error constructors
  createNetworkError: ReturnType<typeof useErrorHandler>['createNetworkError'];
  createValidationError: ReturnType<typeof useErrorHandler>['createValidationError'];
  createAuthError: ReturnType<typeof useErrorHandler>['createAuthError'];
  createBusinessError: ReturnType<typeof useErrorHandler>['createBusinessError'];
  createSystemError: ReturnType<typeof useErrorHandler>['createSystemError'];
}

const ErrorHandlingContext = createContext<ErrorHandlingContextType | null>(null);

interface ErrorHandlingProviderProps {
  children: ReactNode;
  enableOfflineFallback?: boolean;
  enableErrorBoundary?: boolean;
  enableNetworkMonitoring?: boolean;
  enablePWAInstall?: boolean;
}

export const ErrorHandlingProvider: React.FC<ErrorHandlingProviderProps> = ({
  children,
  enableOfflineFallback = true,
  enableErrorBoundary = true,
  enableNetworkMonitoring = true,
  enablePWAInstall = true,
}) => {
  // Initialize all error handling hooks
  const errorHandler = useErrorHandler();
  const asyncErrorHandler = useAsyncErrorHandler();
  const formErrorHandler = useFormErrorHandler();
  const networkHandler = useNetworkHandler();
  const pwaInstall = usePWAInstall();

  // Create context value
  const contextValue: ErrorHandlingContextType = {
    // Error handlers
    handleError: errorHandler.handleError,
    retryWithBackoff: errorHandler.retryWithBackoff,
    logError: errorHandler.logError,
    handleAsync: asyncErrorHandler,
    handleFormError: formErrorHandler,

    // Network handling
    networkState: networkHandler.networkState,
    retryWithNetworkAwareness: networkHandler.retryWithNetworkAwareness,
    networkAwareFetch: networkHandler.networkAwareFetch,
    connectionStatus: networkHandler.connectionStatus,

    // PWA
    canInstall: pwaInstall.canInstall,
    isInstalled: pwaInstall.isInstalled,
    installApp: pwaInstall.installApp,

    // Error constructors
    createNetworkError: errorHandler.createNetworkError,
    createValidationError: errorHandler.createValidationError,
    createAuthError: errorHandler.createAuthError,
    createBusinessError: errorHandler.createBusinessError,
    createSystemError: errorHandler.createSystemError,
  };

  // Show offline fallback if offline and enabled
  if (enableOfflineFallback && !networkHandler.networkState.isOnline) {
    return <OfflineFallback />;
  }

  // Show network error fallback for slow connections
  if (enableNetworkMonitoring && networkHandler.networkState.isSlowConnection) {
    return (
      <NetworkErrorFallback
        message="Slow connection detected. Some features may be slower than usual."
        onRetry={() => window.location.reload()}
      />
    );
  }

  // Wrap with error boundary if enabled
  const wrappedChildren = enableErrorBoundary ? (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Something went wrong
            </h2>
            <p className="text-gray-600">
              We're sorry, but something unexpected happened.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  ) : children;

  return (
    <ErrorHandlingContext.Provider value={contextValue}>
      {wrappedChildren}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#22c55e',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </ErrorHandlingContext.Provider>
  );
};

// Hook to use error handling context
export const useErrorHandling = () => {
  const context = useContext(ErrorHandlingContext);
  if (!context) {
    throw new Error('useErrorHandling must be used within an ErrorHandlingProvider');
  }
  return context;
};

// Higher-order component for error handling
export function withErrorHandling<P extends object>(
  Component: React.ComponentType<P>,
  errorHandlingOptions?: Partial<ErrorHandlingProviderProps>
) {
  const WrappedComponent = (props: P) => (
    <ErrorHandlingProvider {...errorHandlingOptions}>
      <Component {...props} />
    </ErrorHandlingProvider>
  );

  WrappedComponent.displayName = `withErrorHandling(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Hook for network-aware API calls
export const useNetworkAwareAPI = () => {
  const { networkAwareFetch, retryWithNetworkAwareness, networkState } = useErrorHandling();

  return {
    fetch: networkAwareFetch,
    retry: retryWithNetworkAwareness,
    isOnline: networkState.isOnline,
    isSlowConnection: networkState.isSlowConnection,
  };
};

// Hook for error boundary integration
export const useErrorBoundary = () => {
  const { handleError, logError } = useErrorHandling();

  return {
    captureError: (error: Error, errorInfo?: { componentStack?: string }) => {
      const appError = new Error(error.message);
      appError.name = error.name;
      appError.stack = error.stack;

      logError(appError, {
        component: 'ErrorBoundary',
        action: 'error_capture',
        componentStack: errorInfo?.componentStack,
      });

      handleError(appError);
    },
    resetError: () => {
      // This would typically trigger an error boundary reset
      window.location.reload();
    },
  };
};