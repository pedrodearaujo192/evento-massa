'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user && userData) {
        if (userData.tipo === 'super_adm') {
          router.replace('/super-admin');
        } else if (userData.tipo === 'adm_evento') {
          router.replace('/dashboard');
        } else {
          // Default redirect for 'usuario' or other types
          router.replace('/events');
        }
      } else {
        router.replace('/login');
      }
    }
  }, [user, userData, loading, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}
