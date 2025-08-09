'use client';

import { AuthProvider } from './AuthContext';
import { useState, useEffect } from 'react';

export default function AuthProviderSSR({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    // Render children without AuthProvider during SSR
    return children;
  }

  return <AuthProvider>{children}</AuthProvider>;
}