'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'navigation';
import { Loader2, ShieldCheck, Calendar, PlusCircle, LayoutDashboard, Settings } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard-layout';

const navItems = [
  { href: '/super-admin', label: 'Início', icon: LayoutDashboard, tooltip: 'Visão Geral do Sistema' },
  { href: '/dashboard', label: 'Meus Eventos', icon: Calendar, tooltip: 'Meus Eventos Pessoais' },
  { href: '/super-admin/events', label: 'Todos Eventos', icon: Settings, tooltip: 'Gerenciar Todos os Eventos' },
  { href: '/super-admin/admins', label: 'Administradores', icon: ShieldCheck, tooltip: 'Gerenciar Organizadores' },
  { href: '/admin/eventos/novo', label: 'Criar Evento', icon: PlusCircle, tooltip: 'Criar Novo Evento' },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  const isAuthorized = user && userData?.tipo === 'super_adm';

  useEffect(() => {
    if (!loading && !isAuthorized) {
      router.replace('/login');
    }
  }, [loading, isAuthorized, router]);

  if (loading || !isAuthorized) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <DashboardLayout navItems={navItems} allowedRoles={['super_adm']}>
      {children}
    </DashboardLayout>
  );
}
