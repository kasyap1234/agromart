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
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-50 px-6">
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-neutral-600">
          An unexpected error occurred. You can try again or return to the dashboard.
        </p>

        <div className="mt-6 space-x-3">
          <Button onClick={() => reset()}>
            Try again
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
      </div>
    </main>
  );
}