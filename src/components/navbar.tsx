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
    <nav className="sticky top-0 z-50 w-full border-b border-white/5 bg-black/95 backdrop-blur-md">
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="text-3xl font-black font-headline tracking-tighter italic group-hover:scale-105 transition-transform">
            <span className="text-secondary">Evento</span>
            <span className="text-primary">Massa</span>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-10 mx-auto">
          <Link href="/" className="text-sm font-bold text-white/70 hover:text-white transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-primary hover:after:w-full after:transition-all">INÍCIO</Link>
          <Link href="/eventos" className="text-sm font-bold text-white/70 hover:text-white transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-primary hover:after:w-full after:transition-all">EVENTOS</Link>
          <Link href="/sobre" className="text-sm font-bold text-white/70 hover:text-white transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-primary hover:after:w-full after:transition-all">SOBRE</Link>
        </div>

        <div className="flex items-center gap-4">
          {!user ? (
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" className="text-sm font-bold text-white hover:bg-white/10 transition-all px-6 rounded-full border border-white/10">
                  Entrar
                </Button>
              </Link>
              <Link href="/cadastro">
                <Button className="text-sm font-bold bg-secondary hover:bg-secondary/90 text-white px-8 rounded-full shadow-lg shadow-secondary/20 transition-all hover:scale-105">
                  Criar Conta
                </Button>
              </Link>
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-12 flex items-center gap-3 px-2 rounded-full hover:bg-white/5 transition-all">
                  <Avatar className="h-9 w-9 border-2 border-primary/20">
                    <AvatarImage src={`https://picsum.photos/seed/${user.uid}/100/100`} />
                    <AvatarFallback className="bg-primary text-white font-bold">
                      {userData?.nome ? getInitials(userData.nome) : 'EM'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-left hidden sm:flex">
                    <span className="text-xs font-black leading-none text-white">{userData?.nome?.split(' ')[0]}</span>
                    <span className="text-[10px] text-white/40 uppercase font-bold tracking-widest">
                      {userData?.tipo === 'super_adm' ? 'SUPER ADMIN' : userData?.tipo === 'adm_evento' ? 'ORGANIZADOR' : 'CLIENTE'}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-white/40" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-2 rounded-2xl shadow-2xl border-white/10 bg-black text-white">
                <DropdownMenuLabel className="px-3 py-4">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-black leading-none">{userData?.nome}</p>
                    <p className="text-xs leading-none text-white/40 truncate">{userData?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/5" />
                
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
                
                <DropdownMenuSeparator className="bg-white/5" />
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
