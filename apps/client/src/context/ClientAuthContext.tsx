'use client';

import { useAuth } from './AuthContext';

export default function ClientAuthContext({ children }: { children: (auth: any) => React.ReactNode }) {
  const auth = useAuth();
  return <>{children(auth)}</>;
}