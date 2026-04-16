'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!user && pathname !== '/login') {
      router.replace('/login');
    }
  }, [user, pathname, router]);

  if (!user && pathname !== '/login') {
    return null;
  }

  return <>{children}</>;
}
