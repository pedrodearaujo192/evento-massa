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
        // Busca apenas eventos ativos para a vitrine pública
        const q = query(collection(db, 'eventos'), where('status', '==', 'ativo'), limit(12));
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
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
    e.titulo.toLowerCase().includes(search.toLowerCase()) || 
    (e.local && e.local.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      {/* Hero Section - Público e chamativo */}
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
              Sua beleza em <span className="text-primary">evidência</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto font-body">
              Encontre workshops, masterclasses e congressos com os maiores nomes do setor.
            </p>
          </div>
          
          <div className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-3 p-3 bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20">
            <div className="flex-1 flex items-center px-4 gap-3 bg-background/50 rounded-xl border border-input">
              <Search className="h-5 w-5 text-muted-foreground" />
              <input 
                placeholder="Busque por evento, técnica ou cidade..." 
                className="w-full h-12 bg-transparent outline-none text-base font-body"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button className="h-12 rounded-xl px-10 bg-primary hover:bg-primary/90 text-lg font-bold shadow-lg shadow-primary/20 transition-all hover:scale-105">
              Buscar Agora
            </Button>
          </div>
        </div>
      </section>

      {/* Grid de Eventos - Vitrine Pública */}
      <main className="container mx-auto px-4 py-16 flex-grow">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div className="space-y-2">
            <Badge variant="secondary" className="bg-secondary/10 text-secondary border-secondary/20 font-bold px-4 py-1">
              EM ALTA
            </Badge>
            <h2 className="text-4xl font-bold font-headline">Próximas Oportunidades</h2>
          </div>
          <p className="text-muted-foreground font-body max-w-xs text-right hidden md:block">
            Eventos selecionados para elevar o seu nível profissional hoje.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground animate-pulse">Carregando as melhores experiências...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-24 bg-muted/20 rounded-3xl border-2 border-dashed border-muted flex flex-col items-center gap-6">
            <div className="bg-muted p-6 rounded-full">
              <Search className="h-12 w-12 text-muted-foreground opacity-50" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold">Nenhum evento encontrado</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">Tente ajustar sua busca ou explore outras categorias.</p>
            </div>
            <Button variant="outline" onClick={() => setSearch('')}>Limpar busca</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredEvents.map((event) => (
              <Link href={`/evento/${event.id}`} key={event.id} className="group">
                <Card className="h-full overflow-hidden hover:shadow-2xl transition-all duration-500 border-none shadow-lg bg-card relative">
                  <div className="relative h-56 w-full overflow-hidden">
                    <Image 
                      src={event.imagem_url || "https://picsum.photos/seed/event/600/400"} 
                      alt={event.titulo} 
                      fill 
                      className="object-cover group-hover:scale-110 transition-transform duration-700"
                      data-ai-hint="beauty event"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Badge className="absolute top-4 left-4 bg-primary/90 text-white border-none shadow-lg font-bold">
                      {event.categoria}
                    </Badge>
                  </div>
                  
                  <CardHeader className="p-6 space-y-3">
                    <CardTitle className="text-xl font-headline font-bold line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                      {event.titulo}
                    </CardTitle>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-muted-foreground gap-2 font-body">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span>{format(new Date(event.data.replace(/-/g, '/')), "dd 'de' MMMM", { locale: ptBR })}</span>
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground gap-2 font-body">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span className="line-clamp-1">{event.local}</span>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardFooter className="p-6 pt-0 flex items-center justify-between border-t border-muted/30 bg-muted/5 mt-auto">
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground font-body uppercase tracking-wider">A partir de</span>
                      <span className="text-2xl font-bold text-foreground">
                        R$ {event.preco.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
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

      <footer className="bg-foreground text-background py-20 mt-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 text-center md:text-left">
            <div className="space-y-6 col-span-1 md:col-span-1">
              <h3 className="text-3xl font-bold text-primary font-headline italic">EventoMassa</h3>
              <p className="text-sm text-background/60 leading-relaxed font-body">
                Conectando talentos e criando o futuro do mercado da beleza através de experiências inesquecíveis.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-lg mb-6 border-b border-primary/20 pb-2 inline-block">Plataforma</h4>
              <ul className="text-sm space-y-4 text-background/60 font-body">
                <li><Link href="/eventos" className="hover:text-primary transition-colors">Todos os Eventos</Link></li>
                <li><Link href="/categorias" className="hover:text-primary transition-colors">Categorias</Link></li>
                <li><Link href="/organizadores" className="hover:text-primary transition-colors">Para Organizadores</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-lg mb-6 border-b border-primary/20 pb-2 inline-block">Suporte</h4>
              <ul className="text-sm space-y-4 text-background/60 font-body">
                <li><Link href="/ajuda" className="hover:text-primary transition-colors">Central de Ajuda</Link></li>
                <li><Link href="/termos" className="hover:text-primary transition-colors">Termos e Condições</Link></li>
                <li><Link href="/privacidade" className="hover:text-primary transition-colors">Privacidade</Link></li>
              </ul>
            </div>
            <div className="space-y-6">
              <h4 className="font-bold text-lg mb-6 border-b border-primary/20 pb-2 inline-block">Newsletter</h4>
              <p className="text-xs text-background/60 font-body">Receba novidades e descontos exclusivos no seu e-mail.</p>
              <div className="flex gap-2">
                <Input placeholder="seu@email.com" className="bg-background/10 border-background/20 text-background placeholder:text-background/40" />
                <Button className="bg-primary text-white">OK</Button>
              </div>
            </div>
          </div>
          <div className="mt-20 pt-8 border-t border-background/10 text-center text-xs text-background/40 font-body">
            © 2025 EventoMassa. Transformando o setor da beleza, um evento por vez.
          </div>
        </div>
      </footer>
    </div>
  );
}
