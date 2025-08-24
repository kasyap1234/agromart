'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[GlobalError]', error);

    // Handle specific asset loading errors
    if (error.message?.includes('Failed to load') || error.message?.includes('MIME type')) {
      console.error('[AssetError] Asset loading failed:', error.message);
    }
  }, [error]);

  // Determine if this is an asset loading error
  const isAssetError = error.message?.includes('Failed to load') ||
                      error.message?.includes('MIME type') ||
                      error.message?.includes('Loading chunk') ||
                      error.message?.includes('Loading module');

  const isChunkError = error.message?.includes('Loading chunk');

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-50 px-6">
      <div className="text-center max-w-md">
        {isAssetError ? (
          <>
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Asset Loading Error</h1>
            <p className="mt-2 text-sm text-neutral-600">
              {isChunkError
                ? "Some application resources failed to load. This might be due to network issues or caching problems."
                : "Failed to load required assets. This could be due to MIME type issues or missing files."
              }
            </p>
            <p className="mt-2 text-xs text-neutral-500">
              Try refreshing the page or clearing your browser cache.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Something went wrong</h1>
            <p className="mt-2 text-sm text-neutral-600">
              An unexpected error occurred. You can try again or return to the dashboard.
            </p>
          </>
        )}

        <div className="mt-6 space-x-3">
          <Button onClick={() => {
            if (isAssetError) {
              // Clear cache and reload for asset errors
              if ('caches' in window) {
                caches.keys().then(names => {
                  names.forEach(name => caches.delete(name));
                });
              }
              window.location.reload();
            } else {
              reset();
            }
          }}>
            {isAssetError ? 'Reload Page' : 'Try again'}
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
        </div>

        {error?.digest && (
          <p className="mt-4 text-xs text-neutral-400">
            Error Id: {error.digest}
          </p>
        )}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-xs text-neutral-400 hover:text-neutral-600">
              Error Details
            </summary>
            <pre className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded whitespace-pre-wrap">
              {error.message}
            </pre>
          </details>
        )}
      </div>
    </main>
  );
}