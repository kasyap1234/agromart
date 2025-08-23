'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, RefreshCw, Download, Clock, Database } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface OfflineFallbackProps {
  showInstallPrompt?: boolean;
  onRetry?: () => void;
  onInstall?: () => void;
}

interface CacheStats {
  totalSize: number;
  itemCount: number;
  lastUpdated: Date | null;
}

export const OfflineFallback: React.FC<OfflineFallbackProps> = ({
  showInstallPrompt = true,
  onRetry,
  onInstall,
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Back online!');
      if (onRetry) {
        onRetry();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error('You are currently offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onRetry]);

  // Monitor PWA install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Get cache statistics
  useEffect(() => {
    const getCacheStats = async () => {
      try {
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          let totalSize = 0;
          let itemCount = 0;

          for (const cacheName of cacheNames) {
            const cache = await caches.open(cacheName);
            const requests = await cache.keys();

            for (const request of requests) {
              const response = await cache.match(request);
              if (response) {
                const blob = await response.blob();
                totalSize += blob.size;
                itemCount++;
              }
            }
          }

          setCacheStats({
            totalSize,
            itemCount,
            lastUpdated: new Date(),
          });
        }
      } catch (error) {
        console.warn('Failed to get cache stats:', error);
      }
    };

    getCacheStats();
  }, []);

  const handleRetry = async () => {
    setIsRetrying(true);

    // Simulate connection check
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (navigator.onLine) {
      setIsOnline(true);
      toast.success('Connection restored!');
      if (onRetry) {
        onRetry();
      }
    } else {
      toast.error('Still offline. Please check your connection.');
    }

    setIsRetrying(false);
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      (deferredPrompt as any).prompt();
      const { outcome } = await (deferredPrompt as any).userChoice;

      if (outcome === 'accepted') {
        toast.success('App installed successfully!');
      }

      setDeferredPrompt(null);
    } else if (onInstall) {
      onInstall();
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl space-y-6"
      >
        {/* Main Status Card */}
        <Card className="border-2 border-blue-200 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <motion.div
                animate={{
                  rotate: isOnline ? 0 : [0, 10, -10, 0],
                  scale: isOnline ? 1 : [1, 1.1, 1]
                }}
                transition={{
                  rotate: { duration: 2, repeat: Infinity },
                  scale: { duration: 2, repeat: Infinity }
                }}
              >
                {isOnline ? (
                  <Wifi className="w-8 h-8 text-green-600" />
                ) : (
                  <WifiOff className="w-8 h-8 text-red-600" />
                )}
              </motion.div>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              {isOnline ? 'Back Online!' : 'You\'re Offline'}
            </CardTitle>
            <CardDescription className="text-lg">
              {isOnline
                ? 'Great! Your connection has been restored.'
                : 'Don\'t worry, you can still use some features while offline.'
              }
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Connection Status */}
            <div className="flex items-center justify-center space-x-2">
              <Badge variant={isOnline ? 'default' : 'destructive'} className="px-3 py-1">
                {isOnline ? '🟢 Online' : '🔴 Offline'}
              </Badge>
              {isOnline && (
                <Badge variant="secondary" className="px-3 py-1">
                  <Clock className="w-3 h-3 mr-1" />
                  Connected
                </Badge>
              )}
            </div>

            {/* Cache Information */}
            {cacheStats && (
              <Alert>
                <Database className="h-4 w-4" />
                <AlertTitle>Offline Data Available</AlertTitle>
                <AlertDescription className="mt-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>{cacheStats.itemCount}</strong> items cached
                    </div>
                    <div>
                      <strong>{formatBytes(cacheStats.totalSize)}</strong> total size
                    </div>
                  </div>
                  {cacheStats.lastUpdated && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Last updated: {cacheStats.lastUpdated.toLocaleString()}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col space-y-3">
              {!isOnline && (
                <Button
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="w-full"
                  size="lg"
                >
                  {isRetrying ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Checking connection...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Try Again
                    </>
                  )}
                </Button>
              )}

              {showInstallPrompt && deferredPrompt && (
                <Button
                  onClick={handleInstall}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Install App
                </Button>
              )}
            </div>

            {/* Offline Features */}
            {!isOnline && (
              <Alert>
                <AlertTitle>Available Offline</AlertTitle>
                <AlertDescription className="mt-2">
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>View previously loaded data</li>
                    <li>Access cached products and inventory</li>
                    <li>Review saved reports</li>
                    <li>Manage offline queue (when implemented)</li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Tips Card */}
        <Card className="bg-white/60 backdrop-blur-sm">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-gray-900 mb-3">💡 Pro Tips</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Check your WiFi or mobile data connection</li>
              <li>• Move closer to your router or signal source</li>
              <li>• Try switching between WiFi and mobile data</li>
              <li>• Restart your device if issues persist</li>
            </ul>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

// Service Worker Registration Helper
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');

      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              toast.success('App updated! Refresh to get the latest version.', {
                duration: 10000,
              });
            }
          });
        }
      });

      console.log('Service worker registered:', registration);
      return registration;
    } catch (error) {
      console.error('Service worker registration failed:', error);
    }
  }
};

// PWA Install Prompt Hook
export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if already installed
    if ('standalone' in window.navigator && (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (deferredPrompt) {
      (deferredPrompt as any).prompt();
      const { outcome } = await (deferredPrompt as any).userChoice;
      setDeferredPrompt(null);
      return outcome === 'accepted';
    }
    return false;
  };

  return {
    canInstall: !!deferredPrompt,
    isInstalled,
    installApp,
  };
};