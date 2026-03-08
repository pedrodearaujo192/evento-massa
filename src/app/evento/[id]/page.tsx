'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, Calendar, MapPin, Ticket, Info, Minus, Plus, ExternalLink, Youtube, Tag, User, MapPinned } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Icons } from '@/components/icons';

export default function EventPublicPage() {
  const { id } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [event, setEvent] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!id) return;

    async function fetchData() {
      try {
        const eventDoc = await getDoc(doc(db, 'eventos', id as string));
        if (!eventDoc.exists()) {
          router.push('/');
          return;
        }
        setEvent({ id: eventDoc.id, ...eventDoc.data() });

        const ticketsSnap = await getDocs(query(collection(db, 'eventos', id as string, 'ticketTypes'), where('active', '==', true)));
        setTickets(ticketsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id, router]);

  const updateQty = (id: string, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) + delta)
    }));
  };

  const totalItems = Object.values(quantities).reduce((acc, q) => acc + q, 0);
  const totalPrice = tickets.reduce((acc, t) => acc + ((quantities[t.id] || 0) * (t.priceCents || 0)), 0);

  const handleCheckout = () => {
    if (totalItems === 0) {
      toast({ variant: 'destructive', title: 'Selecione ingressos', description: 'Você precisa escolher pelo menos um ingresso.' });
      return;
    }
    
    const selected = tickets.filter(t => (quantities[t.id] || 0) > 0).map(t => ({
      id: t.id,
      name: t.name,
      qty: quantities[t.id],
      priceCents: t.priceCents
    }));
    
    localStorage.setItem('checkout_items', JSON.stringify(selected));
    localStorage.setItem('checkout_total', totalPrice.toString());
    router.push(`/checkout/${id}`);
  };

  const getYoutubeEmbedUrl = (url?: string) => {
    if (!url) return null;
    let videoId = '';
    if (url.includes('v=')) videoId = url.split('v=')[1].split('&')[0];
    else if (url.includes('be/')) videoId = url.split('be/')[1].split('?')[0];
    else if (url.includes('embed/')) videoId = url.split('embed/')[1].split('?')[0];
    
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-black"><Loader2 className="animate-spin text-primary" /></div>;
  if (!event) return null;

  const embedUrl = getYoutubeEmbedUrl(event.youtubeUrl);

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      
      {/* Hero Section Imersiva */}
      <section className="relative min-h-[600px] flex items-center pt-10 pb-20 overflow-hidden">
        {/* Imagem de Fundo com Gradient */}
        <div className="absolute inset-0 z-0">
          <Image 
            src={event.coverUrl || "https://picsum.photos/seed/bg/1920/1080"} 
            alt={event.title} 
            fill 
            className="object-cover opacity-40 grayscale"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/40" />
          {/* Brilhos decorativos (Efeito da Imagem) */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-secondary/10 rounded-full blur-[100px] animate-pulse" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-end">
            <div className="lg:col-span-8 space-y-8">
              {/* Badges */}
              <div className="flex flex-wrap gap-3">
                <div className="inline-flex items-center gap-2 bg-primary px-5 py-2 rounded-full shadow-[0_0_20px_rgba(255,0,127,0.4)]">
                  <Icons.Logo />
                  <span className="text-[10px] font-black tracking-widest uppercase">{event.category}</span>
                </div>
                {event.sector && (
                  <div className="inline-flex items-center px-5 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/10">
                    <span className="text-[10px] font-black tracking-widest uppercase opacity-70">{event.sector}</span>
                  </div>
                )}
              </div>

              {/* Título Monumental */}
              <h1 className="text-4xl md:text-7xl font-black font-headline leading-[1.1] tracking-tight text-white uppercase drop-shadow-2xl">
                {event.title.split('|').map((part: string, idx: number) => (
                  <span key={idx} className={idx === 1 ? 'text-secondary block md:inline' : ''}>
                    {idx === 1 ? ` | ${part}` : part}
                  </span>
                ))}
              </h1>

              {/* Infos rápidas */}
              <div className="flex flex-wrap gap-8 pt-4">
                 <div className="flex items-center gap-3">
                    <div className="bg-primary/20 p-2 rounded-lg border border-primary/30"><Calendar className="h-5 w-5 text-primary" /></div>
                    <div>
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">DATA E HORA</p>
                      <p className="font-black text-sm">{event.startAt ? format(event.startAt.toDate(), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR }) : ''}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-3">
                    <div className="bg-secondary/20 p-2 rounded-lg border border-secondary/30"><MapPinned className="h-5 w-5 text-secondary" /></div>
                    <div>
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">LOCAL DO EVENTO</p>
                      <p className="font-black text-sm">{event.city} - {event.state}</p>
                    </div>
                 </div>
              </div>
            </div>

            {/* Espaço reservado para o card de ingressos (Desktop) */}
            <div className="hidden lg:block lg:col-span-4" />
          </div>
        </div>
      </section>

      {/* Conteúdo Principal */}
      <main className="container mx-auto px-4 -mt-20 relative z-20 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* Lado Esquerdo: Vídeo e Descrição */}
          <div className="lg:col-span-8 space-y-12">
            {embedUrl && (
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                    <div className="bg-red-600 p-2 rounded-lg"><Youtube className="h-5 w-5 text-white" /></div>
                    <h2 className="text-xl font-black font-headline uppercase tracking-tight">Video de Apresentação</h2>
                  </div>
                </div>
                <div className="aspect-video bg-black relative">
                  <iframe 
                    width="100%" 
                    height="100%" 
                    src={embedUrl} 
                    title="Apresentação do Evento" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                    className="absolute inset-0"
                  />
                </div>
              </div>
            )}

            {/* Descrição */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 space-y-8 shadow-2xl">
              <div className="flex items-center gap-4 border-b border-white/10 pb-6">
                <div className="bg-primary p-3 rounded-2xl"><Info className="h-6 w-6 text-white" /></div>
                <h2 className="text-2xl font-black font-headline uppercase tracking-tight">Sobre a Experiência</h2>
              </div>
              <p className="whitespace-pre-wrap text-white/70 leading-relaxed text-lg font-medium tracking-wide italic font-body">
                {event.description}
              </p>
              
              {event.tags && event.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-6">
                   {event.tags.map((tag: string) => (
                     <span key={tag} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/50 bg-white/5 border border-white/10 px-4 py-2 rounded-full hover:bg-white/10 transition-colors">
                       <Tag className="h-3 w-3 text-primary" /> {tag}
                     </span>
                   ))}
                </div>
              )}
            </div>

            {/* Localização Mapa */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 space-y-8 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-secondary p-3 rounded-2xl"><MapPin className="h-6 w-6 text-white" /></div>
                    <h2 className="text-2xl font-black font-headline uppercase tracking-tight">Onde nos encontrar</h2>
                  </div>
                </div>
                <div className="space-y-6">
                    <div className="p-6 bg-white/5 rounded-2xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <p className="font-black text-xl">{event.address}</p>
                          <p className="text-white/50 font-medium">{event.city}, {event.state}</p>
                        </div>
                        {event.mapUrl && (
                          <Button variant="outline" className="h-14 px-8 rounded-xl gap-3 bg-white text-black font-black hover:bg-white/90 border-none transition-all active:scale-95" asChild>
                            <a href={event.mapUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-5 w-5" /> VER NO GOOGLE MAPS
                            </a>
                          </Button>
                        )}
                    </div>
                </div>
            </div>
          </div>

          {/* Lado Direito: Card de Ingressos (Sticky) */}
          <div className="lg:col-span-4 lg:-mt-64 relative">
             <div className="sticky top-24 space-y-6">
                {/* O Card do Layout Referência */}
                <Card className="bg-white rounded-[3rem] overflow-hidden border-none shadow-[0_50px_100px_rgba(0,0,0,0.5)] transform-gpu relative">
                  {/* Camadas decorativas atrás do card (Efeito de Profundidade) */}
                  <div className="absolute -bottom-4 -right-4 w-full h-full bg-secondary/20 rounded-[3rem] -z-10 translate-x-2 translate-y-2 blur-md" />
                  <div className="absolute -bottom-8 -right-8 w-full h-full bg-primary/10 rounded-[3rem] -z-20 translate-x-4 translate-y-4 blur-xl" />

                  <CardHeader className="bg-white pt-10 pb-6 px-10">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-primary/5 rounded-2xl flex items-center justify-center">
                        <Icons.Logo />
                      </div>
                      <CardTitle className="text-3xl font-black font-headline text-black italic">Ingressos</CardTitle>
                    </div>
                    <div className="h-1 w-20 bg-primary/10 mt-4 rounded-full" />
                  </CardHeader>

                  <CardContent className="px-10 pb-10 pt-4 space-y-6">
                    {tickets.map(ticket => (
                      <div key={ticket.id} className="p-6 bg-muted/20 rounded-[2rem] border border-muted/30 transition-all hover:border-primary/20 group">
                        <div className="flex justify-between items-start mb-4">
                          <div className="space-y-1">
                            <p className="font-black text-black text-lg uppercase leading-none">{ticket.name}</p>
                            <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest">{ticket.description || 'Acesso ao Evento'}</p>
                          </div>
                          <div className="text-right">
                             <p className="text-xl font-black text-secondary">
                               {ticket.priceType === 'free' ? 'GRÁTIS' : `R$ ${(ticket.priceCents / 100).toFixed(2).replace('.', ',')}`}
                             </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-black/5">
                          <span className="text-[10px] font-black text-black/40 uppercase tracking-widest">Qtd desejada</span>
                          <div className="flex items-center gap-3 bg-white shadow-sm border rounded-2xl p-1.5">
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-muted text-black transition-all active:scale-90" onClick={() => updateQty(ticket.id, -1)}>
                              <Minus className="h-5 w-5" />
                            </Button>
                            <span className="font-black text-lg min-w-[30px] text-center text-black">{quantities[ticket.id] || 0}</span>
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-muted text-black transition-all active:scale-90" onClick={() => updateQty(ticket.id, 1)}>
                              <Plus className="h-5 w-5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {tickets.length === 0 && (
                      <div className="py-12 text-center text-black/40 font-bold bg-muted/20 rounded-3xl border-2 border-dashed">
                        Lotes esgotados ou indisponíveis no momento.
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="px-10 pb-10 pt-0">
                    <div className="w-full space-y-6">
                       {totalItems > 0 && (
                         <div className="flex justify-between items-center px-4 py-4 bg-secondary/5 rounded-2xl border border-secondary/10">
                            <span className="font-bold text-black/50 text-sm uppercase tracking-widest">Subtotal</span>
                            <span className="font-black text-2xl text-black">R$ {(totalPrice / 100).toFixed(2).replace('.', ',')}</span>
                         </div>
                       )}
                       
                       <Button 
                        onClick={handleCheckout} 
                        className="w-full bg-primary hover:bg-primary/90 text-white font-black h-20 text-xl rounded-[2rem] shadow-[0_20px_40px_rgba(255,0,127,0.3)] transition-all active:scale-95 disabled:opacity-50 disabled:grayscale uppercase tracking-widest" 
                        disabled={totalItems === 0}
                       >
                         {totalItems === 0 ? 'Selecione um Lote' : 'Comprar agora'}
                       </Button>
                       
                       <div className="flex items-center justify-center gap-2 pt-2 opacity-50 grayscale scale-90">
                          <div className="h-px flex-1 bg-black/10" />
                          <span className="text-[10px] font-black text-black uppercase tracking-widest">Pagamento Seguro</span>
                          <div className="h-px flex-1 bg-black/10" />
                       </div>
                    </div>
                  </CardFooter>
                </Card>

                {/* Card do Organizador */}
                <Card className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[2.5rem] p-8 shadow-xl">
                   <CardTitle className="text-sm font-black uppercase tracking-widest text-white/40 mb-6">Organizado por</CardTitle>
                   <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30">
                         <User className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <p className="font-black text-lg text-white">Equipe EventoMassa</p>
                        <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Suporte Especializado</p>
                      </div>
                   </div>
                </Card>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}
