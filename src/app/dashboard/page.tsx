'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Event } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import {
  Card,
  CardContent,
  CardDescription,
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="font-headline text-3xl md:text-4xl">Meus Eventos</h1>
          <p className="text-muted-foreground">Crie e gerencie seus eventos de beleza.</p>
        </div>
        <Link href="/dashboard/events/new" passHref>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Criar Novo Evento
          </Button>
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
          <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Você ainda não criou eventos</h3>
          <p className="mb-4 mt-2 text-sm text-muted-foreground">Comece a divulgar seu próximo sucesso.</p>
          <Link href="/dashboard/events/new" passHref>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Criar Primeiro Evento
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Card key={event.id} className="overflow-hidden flex flex-col shadow-lg transition-all hover:shadow-xl">
              <CardHeader className="p-0 relative">
                 <div className="absolute top-2 right-2 z-10">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full bg-background/70 backdrop-blur-sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar Evento
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled>Ver Ingressos</DropdownMenuItem>
                        <DropdownMenuItem disabled className="text-red-500 focus:bg-red-500/10 focus:text-red-600">
                          Cancelar Evento
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                <div className="relative h-48 w-full">
                  <Image
                    src={event.imagem_url || "https://picsum.photos/seed/default/600/400"}
                    alt={event.titulo}
                    fill
                    className="object-cover"
                     data-ai-hint="event cover"
                  />
                  <Badge variant="secondary" className="absolute top-2 left-2">{event.categoria}</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 flex-grow">
                <CardTitle className="font-headline text-xl mb-2 line-clamp-2">{event.titulo}</CardTitle>
                <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{format(new Date(event.data.replace(/-/g, '/')), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{event.local}</span>
                    </div>
                </div>
              </CardContent>
              <CardFooter className="p-4 pt-0 flex justify-between items-center">
                  <div className="text-lg font-bold text-primary">
                    R$ {event.preco.toFixed(2).replace('.', ',')}
                  </div>
                 <Badge variant={event.status === 'ativo' ? 'default' : 'destructive'} className={`${event.status === 'ativo' ? 'bg-green-500/20 text-green-700 border-green-500/30' : 'bg-red-500/20 text-red-700 border-red-500/30'} hover:bg-none`}>
                    {event.status === 'ativo' ? 'Ativo' : 'Cancelado'}
                </Badge>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
