'use client';

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Loader2, Calendar, User, Upload, PlusCircle } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard-layout';

const navItems = [
  { href: '/dashboard', label: 'Meus Eventos', icon: Calendar, tooltip: 'Meus Eventos' },
  { href: '/dashboard/events/new', label: 'Criar Novo Evento', icon: PlusCircle, tooltip: 'Criar Novo Evento' },
  { href: '/dashboard/profile', label: 'Meu Perfil', icon: User, tooltip: 'Meu Perfil' },
];

export default function EventAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || userData?.tipo !== 'adm_evento') {
    if (typeof window !== 'undefined') {
        router.replace('/login');
    }
    return null;
  }
  
  return <DashboardLayout navItems={navItems} allowedRole="adm_evento">{children}</DashboardLayout>;
}
