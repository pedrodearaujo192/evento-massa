'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Event } from '@/lib/types';
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
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadEvents() {
      try {
        const q = query(collection(db, 'eventos'), where('status', '==', 'ativo'), limit(12));
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
        setEvents(list);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, []);

  const filteredEvents = events.filter(e => 
    e.titulo.toLowerCase().includes(search.toLowerCase()) || 
    e.cidade.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative h-[400px] flex items-center justify-center bg-accent overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image 
            src="https://images.unsplash.com/photo-1540575861501-7ad058133a31?auto=format&fit=crop&q=80&w=2000" 
            alt="Hero Background" 
            fill 
            className="object-cover opacity-40"
            priority
          />
        </div>
        <div className="relative z-10 container mx-auto px-4 text-center space-y-6">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground">
            Encontre o seu <span className="text-primary">próximo evento</span> de beleza
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Workshops, congressos e masterclasses com os melhores profissionais do mercado.
          </p>
          <div className="max-w-xl mx-auto flex gap-2 p-2 bg-white rounded-full shadow-xl border">
            <div className="flex-1 flex items-center px-4 gap-2">
              <Search className="h-5 w-5 text-muted-foreground" />
              <input 
                placeholder="Busque por evento ou cidade..." 
                className="w-full bg-transparent outline-none text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button className="rounded-full px-8 bg-primary hover:bg-primary/90">Buscar</Button>
          </div>
        </div>
      </section>

      {/* Events Grid */}
      <main className="container mx-auto px-4 py-12 flex-grow">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold">Próximos Eventos</h2>
          <Badge variant="outline" className="text-primary border-primary">Vistos recentemente</Badge>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-20 bg-muted/30 rounded-lg">
            <p className="text-muted-foreground text-lg">Nenhum evento encontrado no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredEvents.map((event) => (
              <Link href={`/evento/${event.id}`} key={event.id}>
                <Card className="h-full overflow-hidden hover:shadow-2xl transition-all border-none shadow-md group">
                  <div className="relative h-48 w-full overflow-hidden">
                    <Image 
                      src={event.imagem_url || "https://picsum.photos/seed/event/600/400"} 
                      alt={event.titulo} 
                      fill 
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <Badge className="absolute top-3 left-3 bg-white/90 text-primary hover:bg-white">{event.categoria}</Badge>
                  </div>
                  <CardHeader className="p-4 space-y-1">
                    <CardTitle className="text-lg line-clamp-2 leading-tight">{event.titulo}</CardTitle>
                    <div className="flex items-center text-xs text-muted-foreground gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{format(new Date(event.data.replace(/-/g, '/')), "dd 'de' MMM", { locale: ptBR })}</span>
                      <span className="mx-1">•</span>
                      <MapPin className="h-3 w-3" />
                      <span>{event.cidade}</span>
                    </div>
                  </CardHeader>
                  <CardFooter className="p-4 pt-0 flex items-center justify-between">
                    <span className="font-bold text-primary">R$ {event.preco.toFixed(2).replace('.', ',')}</span>
                    <Button variant="secondary" size="sm" className="bg-secondary text-white hover:bg-secondary/90">Garantir</Button>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer className="bg-muted py-12 mt-12 border-t">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-primary">EventoMassa</h3>
            <p className="text-sm text-muted-foreground">A maior plataforma de eventos para o setor da beleza no Brasil.</p>
          </div>
          <div>
            <h4 className="font-bold mb-4">Links Úteis</h4>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li><Link href="/login">Área do Organizador</Link></li>
              <li><Link href="/ajuda">Central de Ajuda</Link></li>
              <li><Link href="/termos">Termos de Uso</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Redes Sociais</h4>
            <div className="flex justify-center md:justify-start gap-4">
              <div className="w-8 h-8 bg-primary rounded-full" />
              <div className="w-8 h-8 bg-secondary rounded-full" />
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-12 pt-8 border-t text-center text-xs text-muted-foreground">
          © 2025 EventoMassa. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
