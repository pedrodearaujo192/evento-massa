import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Event } from "@/lib/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { Calendar, MapPin } from "lucide-react";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

async function getAllEvents() {
  const eventsCol = collection(db, "eventos");
  const q = query(eventsCol, orderBy("criadoEm", "desc"));
  const eventsSnapshot = await getDocs(q);
  const eventList = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
  return eventList;
}

export default async function AllEventsPage() {
  const events = await getAllEvents();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-headline text-3xl md:text-4xl">Todos os Eventos</h1>
        <p className="text-muted-foreground">Uma lista de todos os eventos cadastrados na plataforma.</p>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Nenhum evento encontrado</h3>
            <p className="mb-4 mt-2 text-sm text-muted-foreground">Ainda não há eventos cadastrados no sistema.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {events.map((event) => (
            <Card key={event.id} className="overflow-hidden flex flex-col">
              <CardHeader className="p-0">
                <div className="relative h-48 w-full">
                  <Image
                    src={event.imagem_url || "https://picsum.photos/seed/default/600/400"}
                    alt={event.titulo}
                    fill
                    className="object-cover"
                    data-ai-hint="event cover"
                  />
                  <Badge variant="secondary" className="absolute top-2 right-2">{event.categoria}</Badge>
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
