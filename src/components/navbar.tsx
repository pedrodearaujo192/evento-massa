'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { User, LogOut, Calendar, Award, LayoutDashboard, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function Navbar() {
  const { user, userData } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-3xl font-black text-secondary font-headline tracking-tighter italic group-hover:scale-105 transition-transform">
            EventoMassa
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8 mr-auto ml-12">
          <Link href="/" className="text-sm font-bold hover:text-primary transition-colors">INÍCIO</Link>
          <Link href="/eventos" className="text-sm font-bold hover:text-primary transition-colors">EVENTOS</Link>
          <Link href="/sobre" className="text-sm font-bold hover:text-primary transition-colors">SOBRE</Link>
        </div>

        <div className="flex items-center gap-4">
          {!user ? (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" className="text-sm font-bold hover:bg-primary/10 hover:text-primary transition-all">
                  ENTRAR
                </Button>
              </Link>
              <Link href="/cadastro">
                <Button className="text-sm font-bold bg-secondary hover:bg-secondary/90 text-white px-6 rounded-full shadow-lg shadow-secondary/20 transition-all hover:scale-105">
                  CRIAR CONTA
                </Button>
              </Link>
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-12 flex items-center gap-3 px-2 rounded-full hover:bg-muted transition-all">
                  <Avatar className="h-9 w-9 border-2 border-primary/20">
                    <AvatarImage src={`https://picsum.photos/seed/${user.uid}/100/100`} />
                    <AvatarFallback className="bg-primary text-white font-bold">
                      {userData?.nome ? getInitials(userData.nome) : 'EM'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-left hidden sm:flex">
                    <span className="text-xs font-black leading-none">{userData?.nome?.split(' ')[0]}</span>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{userData?.tipo === 'super_adm' ? 'SUPER ADMIN' : userData?.tipo === 'adm_evento' ? 'ORGANIZADOR' : 'CLIENTE'}</span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-2 rounded-2xl shadow-2xl border-muted/50">
                <DropdownMenuLabel className="px-3 py-4">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-black leading-none">{userData?.nome}</p>
                    <p className="text-xs leading-none text-muted-foreground truncate">{userData?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-muted/50" />
                
                {userData?.tipo === 'adm_evento' || userData?.tipo === 'super_adm' ? (
                  <DropdownMenuItem asChild className="p-3 cursor-pointer rounded-xl focus:bg-primary focus:text-white group">
                    <Link href={userData.tipo === 'super_adm' ? '/super-admin' : '/dashboard'} className="flex items-center w-full">
                      <LayoutDashboard className="mr-3 h-5 w-5 group-focus:scale-110 transition-transform" />
                      <span className="font-bold">Painel de Controle</span>
                    </Link>
                  </DropdownMenuItem>
                ) : (
                  <>
                    <DropdownMenuItem asChild className="p-3 cursor-pointer rounded-xl focus:bg-primary focus:text-white group">
                      <Link href="/meus-eventos" className="flex items-center w-full">
                        <Calendar className="mr-3 h-5 w-5 group-focus:scale-110 transition-transform" />
                        <span className="font-bold">Meus Ingressos</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="p-3 cursor-pointer rounded-xl focus:bg-primary focus:text-white group">
                      <Link href="/meus-certificados" className="flex items-center w-full">
                        <Award className="mr-3 h-5 w-5 group-focus:scale-110 transition-transform" />
                        <span className="font-bold">Meus Certificados</span>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                
                <DropdownMenuSeparator className="bg-muted/50" />
                <DropdownMenuItem 
                  onClick={handleLogout} 
                  className="p-3 text-destructive cursor-pointer rounded-xl focus:bg-destructive focus:text-white font-bold group"
                >
                  <LogOut className="mr-3 h-5 w-5 group-focus:scale-110 transition-transform" />
                  Sair da Conta
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </nav>
  );
}
