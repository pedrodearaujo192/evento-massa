
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Event } from "@/lib/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { Calendar, MapPin, User, Tag } from "lucide-react";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

async function getAllEvents() {
  const eventsCol = collection(db, "eventos");
  const q = query(eventsCol, orderBy("createdAt", "desc"));
  const eventsSnapshot = await getDocs(q);
  const eventList = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
  return eventList;
}

export default async function AllEventsPage() {
  const events = await getAllEvents();

  return (
    <div className="space-y-6 pb-10">
      <div className="space-y-2">
        <h1 className="font-headline text-3xl md:text-4xl">Todos os Eventos</h1>
        <p className="text-muted-foreground">Visão global de todos os eventos criados por todos os organizadores.</p>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 text-center bg-muted/10">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
            <h3 className="mt-4 text-lg font-bold">Nenhum evento encontrado</h3>
            <p className="mb-4 mt-2 text-sm text-muted-foreground">Ainda não há eventos cadastrados no sistema.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {events.map((event) => (
            <Card key={event.id} className="overflow-hidden flex flex-col border-none shadow-md hover:shadow-xl transition-all group">
              <CardHeader className="p-0 relative">
                <div className="relative h-44 w-full overflow-hidden">
                  <Image
                    src={event.coverUrl || "https://picsum.photos/seed/default/600/400"}
                    alt={event.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-2 left-2 flex gap-1">
                    <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm text-primary font-bold">{event.category}</Badge>
                    <Badge variant={event.status === 'published' ? 'default' : 'outline'} className={event.status === 'published' ? 'bg-green-500' : 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'}>
                      {event.status === 'published' ? 'ATIVO' : 'RASCUNHO'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 flex-grow space-y-3">
                <CardTitle className="font-headline text-lg line-clamp-2 leading-tight h-10">{event.title}</CardTitle>
                <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        <span>{event.startAt ? format(event.startAt.toDate(), "dd 'de' MMMM, yyyy", { locale: ptBR }) : 'Em breve'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        <span className="line-clamp-1">{event.city} - {event.state}</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1 border-t mt-2">
                        <User className="h-3.5 w-3.5" />
                        <span className="truncate">Organizador: {event.ownerId?.slice(0, 8)}...</span>
                    </div>
                </div>
              </CardContent>
              <CardFooter className="p-4 pt-0 border-t bg-muted/5 flex justify-between items-center">
                 <div className="text-xs font-mono text-muted-foreground">ID: {event.id.slice(0, 8)}</div>
                 <Badge variant="ghost" className="text-[10px] uppercase tracking-tighter">Capacidade: {event.capacity}</Badge>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
