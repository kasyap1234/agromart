"use client";

import { WifiOff, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function OfflinePage() {
  const handleRetry = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="mx-auto w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center">
          <WifiOff className="w-12 h-12 text-orange-600" />
        </div>

        {/* Content */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-gray-900">You're Offline</h1>
          <p className="text-gray-600 text-lg">
            It looks like you're not connected to the internet. Some features may not be available.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button onClick={handleRetry} className="w-full" size="lg">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>

          <Button variant="outline" className="w-full" asChild>
            <Link href="/">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Link>
          </Button>
        </div>

        {/* Features Available Offline */}
        <div className="mt-8 p-4 bg-white rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-2">Available Offline:</h3>
          <ul className="text-sm text-gray-600 space-y-1 text-left">
            <li>• View cached data</li>
            <li>• Access previously loaded pages</li>
            <li>• Use basic app functionality</li>
          </ul>
        </div>

        {/* Tips */}
        <div className="text-xs text-gray-500">
          <p>💡 Tip: Your work will be synced when you're back online</p>
        </div>
      </div>
    </div>
  );
}