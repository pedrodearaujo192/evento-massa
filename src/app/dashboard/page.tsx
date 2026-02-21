'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Event } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Loader2, PlusCircle, Calendar, MapPin, Edit, MoreVertical } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function DashboardPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      const q = query(
        collection(db, 'eventos'),
        where('id_criador', '==', user.uid)
      );
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const eventsData: Event[] = [];
        querySnapshot.forEach((doc) => {
          eventsData.push({ id: doc.id, ...doc.data() } as Event);
        });
        
        // Sort events on the client-side by creation date, descending
        eventsData.sort((a, b) => {
          const timeA = a.criadoEm?.toMillis() || 0;
          const timeB = b.criadoEm?.toMillis() || 0;
          return timeB - timeA;
        });

        setEvents(eventsData);
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-6">
        <div className="space-y-2">
          <h1 className="font-headline text-3xl md:text-4xl">Meus Eventos</h1>
          <p className="text-muted-foreground">Crie e gerencie seus eventos de beleza.</p>
        </div>
        <Button asChild size="lg" className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
          <Link href="/dashboard/events/new">
            <PlusCircle className="mr-2 h-5 w-5" />
            CRIAR NOVO EVENTO
          </Link>
        </Button>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-20 text-center bg-muted/10">
          <div className="bg-background p-6 rounded-full shadow-sm mb-6">
            <Calendar className="h-12 w-12 text-muted-foreground opacity-20" />
          </div>
          <h3 className="text-2xl font-bold font-headline">Nenhum evento criado</h3>
          <p className="mb-8 mt-2 text-muted-foreground max-w-sm">
            Você ainda não divulgou nenhum evento. Clique no botão abaixo para começar agora mesmo.
          </p>
          <Button asChild size="lg">
            <Link href="/dashboard/events/new">
              <PlusCircle className="mr-2 h-5 w-5" />
              Criar Meu Primeiro Evento
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Card key={event.id} className="overflow-hidden flex flex-col shadow-lg transition-all hover:shadow-xl border-none">
              <CardHeader className="p-0 relative">
                 <div className="absolute top-3 right-3 z-10">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="icon" className="h-9 w-9 rounded-full bg-white/80 backdrop-blur-sm shadow-md hover:bg-white">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl">
                        <DropdownMenuItem className="cursor-pointer">
                          <Edit className="mr-2 h-4 w-4" />
                          Editar Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer" disabled>Ver Ingressos Vendidos</DropdownMenuItem>
                        <DropdownMenuItem disabled className="text-red-500 focus:bg-red-500/10 focus:text-red-600 cursor-not-allowed">
                          Encerrar Vendas
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                <div className="relative h-52 w-full">
                  <Image
                    src={event.imagem_url || "https://picsum.photos/seed/default/600/400"}
                    alt={event.titulo}
                    fill
                    className="object-cover"
                     data-ai-hint="event cover"
                  />
                  <Badge variant="secondary" className="absolute top-3 left-3 bg-white/90 text-primary font-bold">{event.categoria}</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6 flex-grow">
                <CardTitle className="font-headline text-2xl mb-4 line-clamp-2 leading-tight">{event.titulo}</CardTitle>
                <div className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="font-medium text-foreground">
                          {format(new Date(event.data.replace(/-/g, '/')), "dd 'de' MMMM", { locale: ptBR })}
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span className="line-clamp-1">{event.local}</span>
                    </div>
                </div>
              </CardContent>
              <CardFooter className="p-6 pt-0 flex justify-between items-center border-t border-muted/30 mt-auto bg-muted/5">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Ingresso</span>
                    <div className="text-xl font-black text-primary">
                      R$ {event.preco.toFixed(2).replace('.', ',')}
                    </div>
                  </div>
                 <Badge variant={event.status === 'ativo' ? 'default' : 'destructive'} className={`${event.status === 'ativo' ? 'bg-green-500/10 text-green-700 border-green-500/20' : 'bg-red-500/10 text-red-700 border-red-500/20'} font-bold shadow-none`}>
                    {event.status === 'ativo' ? 'PUBLICADO' : 'CANCELADO'}
                </Badge>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
