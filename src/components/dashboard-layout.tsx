
'use client';

import React, { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Icons } from './icons';
import { Home, LogOut, Settings, User as UserIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  tooltip: string;
};

type DashboardLayoutProps = {
  children: ReactNode;
  navItems: NavItem[];
  allowedRoles: ('super_adm' | 'adm_evento')[];
};

export function DashboardLayout({ children, navItems, allowedRoles }: DashboardLayoutProps) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: 'Você saiu da sua conta.' });
      router.push('/login');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao sair.', description: 'Tente novamente.' });
    }
  };
  
  if (loading) {
    return null;
  }

  if (!user || !userData || !allowedRoles.includes(userData.tipo as any)) {
    if (typeof window !== 'undefined' && !loading) {
        router.replace('/login');
    }
    return null;
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('');
  };

  return (
    <SidebarProvider defaultOpen>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2">
            <Icons.Logo />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={item.tooltip}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
           <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout} tooltip="Sair">
                  <LogOut />
                  <span>Sair</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
           </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6">
          <SidebarTrigger className="md:hidden" />
          <div className="flex-1">
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={`https://picsum.photos/seed/${user.uid}/100/100`} data-ai-hint="person portrait" />
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                    {userData?.nome ? getInitials(userData.nome) : ''}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{userData?.nome}</p>
                  <p className="text-xs leading-none text-muted-foreground">{userData?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={userData?.tipo === 'adm_evento' ? '/dashboard/profile' : '/super-admin/profile'}>
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Perfil</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <Home className="mr-2 h-4 w-4" />
                <span>Voltar ao Site</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
