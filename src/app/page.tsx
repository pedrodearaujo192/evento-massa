'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Calendar, MapPin, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Navbar } from '@/components/navbar';

export default function HomePage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadEvents() {
      try {
        const q = query(
          collection(db, 'eventos'), 
          where('status', '==', 'published'),
          limit(12)
        );
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setEvents(list);
      } catch (error) {
        console.error("Erro ao carregar eventos:", error);
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, []);

  const filteredEvents = events.filter(e => 
    e.title?.toLowerCase().includes(search.toLowerCase()) || 
    e.city?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <section className="relative h-[450px] flex items-center justify-center bg-accent overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image 
            src="https://images.unsplash.com/photo-1540575861501-7ad058133a31?auto=format&fit=crop&q=80&w=2000" 
            alt="Fundo Hero" 
            fill 
            className="object-cover opacity-30"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/80" />
        </div>
        <div className="relative z-10 container mx-auto px-4 text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-bold text-foreground font-headline tracking-tight">
              Garanta <span className="text-secondary">seu lugar</span> nos melhores <span className="text-primary">eventos</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto font-body">
              Encontre workshops, masterclasses e congressos com os maiores nomes do setor.
            </p>
          </div>
          
          <div className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-3 p-3 bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20">
            <div className="flex-1 flex items-center px-4 gap-3 bg-background/50 rounded-xl border border-input">
              <Search className="h-5 w-5 text-muted-foreground" />
              <input 
                placeholder="Busque por evento ou cidade..." 
                className="w-full h-12 bg-transparent outline-none text-base font-body"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button className="h-12 rounded-xl px-10 bg-primary hover:bg-primary/90 text-lg font-bold">
              Buscar
            </Button>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-16 flex-grow">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div className="space-y-2">
            <Badge variant="secondary" className="bg-secondary/10 text-secondary border-secondary/20 font-bold px-4 py-1">
              EM ALTA
            </Badge>
            <h2 className="text-4xl font-bold font-headline">Próximas Oportunidades</h2>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-24 bg-muted/20 rounded-3xl border-2 border-dashed border-muted flex flex-col items-center gap-6">
            <p className="text-muted-foreground">Nenhum evento publicado no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredEvents.map((event) => (
              <Link href={`/evento/${event.id}`} key={event.id} className="group">
                <Card className="h-full overflow-hidden hover:shadow-2xl transition-all duration-500 border-none shadow-lg bg-card relative">
                  <div className="relative h-56 w-full overflow-hidden">
                    <Image 
                      src={event.coverUrl || "https://picsum.photos/seed/event/600/400"} 
                      alt={event.title} 
                      fill 
                      className="object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <Badge className="absolute top-4 left-4 bg-primary/90 text-white border-none shadow-lg font-bold">
                      {event.category}
                    </Badge>
                  </div>
                  
                  <CardHeader className="p-6 space-y-3">
                    <CardTitle className="text-xl font-headline font-bold line-clamp-2 leading-tight">
                      {event.title}
                    </CardTitle>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-muted-foreground gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span>{event.startAt ? format(event.startAt.toDate(), "dd 'de' MMMM", { locale: ptBR }) : 'Em breve'}</span>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span className="line-clamp-1">{event.city} - {event.state}</span>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardFooter className="p-6 pt-0 flex items-center justify-between border-t border-muted/30 bg-muted/5 mt-auto">
                    <span className="text-sm font-bold text-foreground">Ver Ingressos</span>
                    <Button variant="default" className="bg-secondary hover:bg-secondary/90 text-white font-bold rounded-xl px-6">
                      Garantir
                    </Button>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
