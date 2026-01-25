'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserProfile } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, PlusCircle, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function AdminsPage() {
  const [admins, setAdmins] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const q = query(collection(db, 'usuarios'), where('tipo', '==', 'adm_evento'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const adminsData: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        adminsData.push({ uid: doc.id, ...doc.data() } as UserProfile);
      });
      setAdmins(adminsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleStatusChange = async (uid: string, newStatus: boolean) => {
    const adminRef = doc(db, 'usuarios', uid);
    try {
      await updateDoc(adminRef, { ativo: newStatus });
      toast({
        title: 'Status atualizado',
        description: `O admin foi ${newStatus ? 'ativado' : 'desativado'}.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: 'Não foi possível alterar o status do admin.',
      });
    }
  };
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
            <h1 className="font-headline text-3xl md:text-4xl">Administradores</h1>
            <p className="text-muted-foreground">Gerencie os administradores de eventos.</p>
        </div>
        <Link href="/super-admin/admins/new" passHref>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Admin
          </Button>
        </Link>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden md:table-cell">Empresa</TableHead>
              <TableHead className="hidden sm:table-cell">Status</TableHead>
              <TableHead className="text-right">Ativo</TableHead>
              <TableHead>
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                </TableCell>
              </TableRow>
            ) : admins.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Nenhum administrador encontrado.
                </TableCell>
              </TableRow>
            ) : (
              admins.map((admin) => (
                <TableRow key={admin.uid}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={`https://picsum.photos/seed/${admin.uid}/100/100`} data-ai-hint="person portrait" />
                        <AvatarFallback className="bg-secondary text-secondary-foreground font-semibold">
                          {getInitials(admin.nome)}
                        </AvatarFallback>
                      </Avatar>
                      <div className='flex flex-col'>
                         <span>{admin.nome}</span>
                         <span className='text-xs text-muted-foreground md:hidden'>{admin.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{admin.empresa || 'N/A'}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={admin.ativo ? 'default' : 'destructive'} className={`${admin.ativo ? 'bg-green-500/20 text-green-700 border-green-500/30' : 'bg-red-500/20 text-red-700 border-red-500/30'} hover:bg-none`}>
                      {admin.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Switch
                      checked={admin.ativo}
                      onCheckedChange={(checked) => handleStatusChange(admin.uid, checked)}
                      aria-label={`Ativar/Desativar ${admin.nome}`}
                    />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem disabled>Editar</DropdownMenuItem>
                        <DropdownMenuItem disabled className="text-red-500">
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
