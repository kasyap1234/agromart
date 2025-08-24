'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';
import { Alert, AlertDescription, AlertTitle } from './alert';
import { toast } from 'react-hot-toast';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showErrorDetails?: boolean;
  enableRetry?: boolean;
  maxRetries?: number;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  isRetrying: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      errorInfo,
    });

    // Log error to external service
    this.logError(error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Show toast notification
    toast.error('Something went wrong. Please try refreshing the page.');
  }

  override componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private logError = (error: Error, errorInfo: ErrorInfo) => {
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Boundary Caught Error');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.groupEnd();
    }

    // In production, you would send this to an error reporting service
    // Example: Sentry, LogRocket, Bugsnag, etc.
    if (process.env.NODE_ENV === 'production') {
      // TODO: Integrate with error reporting service
      console.error('Production Error:', errorDetails);
    }
  };

  private handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    const { retryCount } = this.state;

    if (retryCount >= maxRetries) {
      toast.error('Maximum retry attempts reached. Please refresh the page.');
      return;
    }

    this.setState({ isRetrying: true, retryCount: retryCount + 1 });

    // Simulate retry with exponential backoff
    const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);

    this.retryTimeoutId = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        isRetrying: false,
      });
    }, delay);
  };

  private handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard';
    }
  };

  private handleReportBug = () => {
    const { error, errorInfo } = this.state;
    const subject = 'Bug Report - Application Error';
    const body = `
Error Details:
Message: ${error?.message || 'Unknown error'}
Stack: ${error?.stack || 'No stack trace'}
Component Stack: ${errorInfo?.componentStack || 'No component stack'}
URL: ${typeof window !== 'undefined' ? window.location.href : 'unknown'}
User Agent: ${typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown'}
Timestamp: ${new Date().toISOString()}

Please describe what you were doing when this error occurred:
`;

    const mailtoLink = `mailto:support@example.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    if (typeof window !== 'undefined') {
      window.open(mailtoLink);
    }
  };

  override render() {
    const { hasError, error, errorInfo, isRetrying, retryCount } = this.state;
    const { fallback, showErrorDetails = false, enableRetry = true, children } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-900">
                Something went wrong
              </CardTitle>
              <CardDescription>
                We're sorry, but something unexpected happened. Our team has been notified.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {showErrorDetails && error && (
                <Alert>
                  <Bug className="h-4 w-4" />
                  <AlertTitle>Error Details</AlertTitle>
                  <AlertDescription className="mt-2">
                    <details className="space-y-2">
                      <summary className="cursor-pointer font-medium">
                        Click to view technical details
                      </summary>
                      <div className="mt-2 space-y-2 text-sm">
                        <div>
                          <strong>Message:</strong>
                          <pre className="mt-1 whitespace-pre-wrap break-all text-xs">
                            {error.message}
                          </pre>
                        </div>
                        {error.stack && (
                          <div>
                            <strong>Stack Trace:</strong>
                            <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-all text-xs bg-gray-100 p-2 rounded">
                              {error.stack}
                            </pre>
                          </div>
                        )}
                      </div>
                    </details>
                  </AlertDescription>
                </Alert>
              )}

              {retryCount > 0 && (
                <Alert>
                  <RefreshCw className="h-4 w-4" />
                  <AlertTitle>Retry Attempts</AlertTitle>
                  <AlertDescription>
                    Attempted to recover {retryCount} time(s)
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>

            <CardFooter className="flex flex-col space-y-2">
              {enableRetry && (
                <Button
                  onClick={this.handleRetry}
                  disabled={isRetrying}
                  className="w-full"
                  variant="default"
                >
                  {isRetrying ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Try Again
                    </>
                  )}
                </Button>
              )}

              <div className="flex space-x-2 w-full">
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="flex-1"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Go Home
                </Button>
                <Button
                  onClick={this.handleReportBug}
                  variant="outline"
                  className="flex-1"
                >
                  <Bug className="mr-2 h-4 w-4" />
                  Report Bug
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return children;
  }
}

// Higher-order component for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Hook for imperatively triggering error boundary
export const useErrorHandler = () => {
  return (error: Error) => {
    // This will trigger the nearest error boundary
    throw error;
  };
};

// Wrapper component for easier usage with retry functionality
interface ErrorBoundaryWrapperProps extends Omit<Props, 'children'> {
  children: ReactNode;
  onRetry?: () => void;
  title?: string;
  description?: string;
}

export const ErrorBoundaryWrapper: React.FC<ErrorBoundaryWrapperProps> = ({
  children,
  onRetry,
  title = "Something went wrong",
  description = "We're having trouble loading this content. Please try again.",
  ...props
}) => {
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      // Default retry behavior - reload the page
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }
  };

  return (
    <ErrorBoundary
      {...props}
      fallback={
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-900">
                {title}
              </CardTitle>
              <CardDescription>
                {description}
              </CardDescription>
            </CardHeader>

            <CardFooter className="flex justify-center space-x-2">
              <Button onClick={handleRetry} variant="default">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button onClick={() => window.location.href = '/dashboard'} variant="outline">
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Button>
            </CardFooter>
          </Card>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
};