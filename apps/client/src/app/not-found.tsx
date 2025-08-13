'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-50 px-6">
      <div className="text-center">
        <p className="text-sm font-semibold text-primary-600">404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-900">Page not found</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Sorry, we couldn’t find the page you’re looking for.
        </p>
        <div className="mt-8 flex items-center justify-center gap-x-3">
          <Button asChild variant="outline">
            <Link href="/">Go back home</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}