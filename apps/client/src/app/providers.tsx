'use client';

import { AuthProvider } from '@/context/AuthContext';
import { ErrorHandlingProvider } from '@/context/ErrorHandlingProvider';
import { ThemeProvider } from 'next-themes';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorHandlingProvider
      enableOfflineFallback={true}
      enableErrorBoundary={true}
      enableNetworkMonitoring={true}
      enablePWAInstall={true}
    >
      <AuthProvider>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </AuthProvider>
    </ErrorHandlingProvider>
  );
}