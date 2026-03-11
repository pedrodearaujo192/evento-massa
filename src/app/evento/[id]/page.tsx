'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, Calendar, MapPin, Ticket, Info, Minus, Plus, ExternalLink, Youtube, Tag, MapPinned, ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

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

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  if (!event) return null;

  const embedUrl = getYoutubeEmbedUrl(event.youtubeUrl);
  const isDark = event.themeMode === 'dark';
  const primary = event.primaryColor || '#FF007F';
  const secondary = event.secondaryColor || '#22C55E';

  return (
    <div className={cn("min-h-screen transition-colors duration-500", isDark ? "bg-black text-white" : "bg-white text-black")}>
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-[1000px] mx-auto space-y-12">
          
          <section className="relative w-full rounded-[2.5rem] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.3)] bg-black/5 flex justify-center">
             <Image 
               src={event.coverUrl || "https://picsum.photos/seed/event/1000/1200"} 
               alt={event.title} 
               width={1000}
               height={1200}
               className="w-full h-auto block"
               priority
               unoptimized
             />
          </section>

          <section className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="flex flex-wrap gap-3">
              <Badge className="px-6 py-2 rounded-full font-black uppercase tracking-widest text-[10px] text-white border-none" style={{ backgroundColor: primary }}>
                {event.category}
              </Badge>
              {event.sector && (
                <Badge variant="outline" className={cn("px-6 py-2 rounded-full font-black uppercase tracking-widest text-[10px]", isDark ? "border-white/20 text-white/70" : "border-black/10 text-black/70")}>
                  {event.sector}
                </Badge>
              )}
            </div>

            <h1 className={cn("text-4xl md:text-7xl font-black font-headline leading-[1.1] tracking-tight", isDark ? "text-white" : "text-black")}>
              {event.title}
            </h1>

            <div className="flex flex-wrap gap-8 items-center pt-2">
               <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl" style={{ backgroundColor: `${primary}15`, border: `1px solid ${primary}30` }}>
                    <Calendar className="h-6 w-6" style={{ color: primary }} />
                  </div>
                  <div>
                    <p className={cn("text-[10px] font-bold uppercase tracking-widest opacity-50")}>DATA E HORA</p>
                    <p className="font-black text-lg">{event.startAt ? format(event.startAt.toDate(), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR }) : ''}</p>
                  </div>
               </div>
               <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl" style={{ backgroundColor: `${secondary}15`, border: `1px solid ${secondary}30` }}>
                    <MapPinned className="h-6 w-6" style={{ color: secondary }} />
                  </div>
                  <div>
                    <p className={cn("text-[10px] font-bold uppercase tracking-widest opacity-50")}>CIDADE</p>
                    <p className="font-black text-lg uppercase">{event.city} - {event.state}</p>
                  </div>
               </div>
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            
            <div className="lg:col-span-7 space-y-10">
              
              <div className={cn("p-10 rounded-[2.5rem] border space-y-6", isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/5")}>
                 <div className="flex items-center gap-3">
                    <Info className="h-6 w-6" style={{ color: primary }} />
                    <h2 className="text-xl font-black font-headline uppercase tracking-tight">Sobre o Evento</h2>
                 </div>
                 <p className={cn("whitespace-pre-wrap leading-relaxed text-lg font-medium", isDark ? "text-white/70" : "text-black/70")}>
                    {event.description}
                 </p>
                 {event.tags && event.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-4">
                    {event.tags.map((tag: string) => (
                      <span key={tag} className={cn("text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border", isDark ? "bg-white/5 border-white/10 text-white/40" : "bg-black/5 border-black/5 text-black/40")}>
                        # {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {embedUrl && (
                <div className={cn("rounded-[2.5rem] overflow-hidden border shadow-xl", isDark ? "border-white/10" : "border-black/5")}>
                  <div className="aspect-video">
                    <iframe width="100%" height="100%" src={embedUrl} title="Apresentação" frameBorder="0" allowFullScreen />
                  </div>
                </div>
              )}

              <div className={cn("p-10 rounded-[2.5rem] border space-y-6", isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/5")}>
                 <div className="flex items-center gap-3">
                    <MapPin className="h-6 w-6" style={{ color: secondary }} />
                    <h2 className="text-xl font-black font-headline uppercase tracking-tight">Localização</h2>
                 </div>
                 <div className="space-y-4">
                    <div>
                      <p className="font-black text-2xl uppercase">{event.address}</p>
                      <p className="font-medium opacity-60 uppercase">{event.city}, {event.state}</p>
                    </div>
                    {event.mapUrl && (
                      <Button className="h-14 px-10 rounded-2xl gap-3 font-black transition-all hover:scale-105 active:scale-95 text-white" style={{ backgroundColor: primary }} asChild>
                        <a href={event.mapUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-5 w-5" /> ABRIR NO GOOGLE MAPS
                        </a>
                      </Button>
                    )}
                 </div>
              </div>
            </div>

            <div className="lg:col-span-5 relative">
              <div className="sticky top-28">
                <Card className="rounded-[3rem] border-none shadow-[0_40px_80px_rgba(0,0,0,0.3)] bg-white overflow-hidden">
                  <CardHeader className="bg-white p-10 pb-6">
                    <CardTitle className="text-3xl font-black font-headline text-black uppercase tracking-tighter">Ingressos</CardTitle>
                    <div className="h-1.5 w-16 rounded-full" style={{ backgroundColor: `${primary}30` }} />
                  </CardHeader>

                  <CardContent className="px-10 space-y-6">
                    {tickets.map(ticket => (
                      <div key={ticket.id} className="p-6 rounded-[2rem] border border-black/5 bg-black/[0.02] hover:bg-black/[0.04] transition-colors group">
                        <div className="flex justify-between items-start mb-4">
                          <div className="space-y-1">
                            <p className="font-black text-black text-lg uppercase leading-none">{ticket.name}</p>
                            <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest">{ticket.description || 'Lote Disponível'}</p>
                          </div>
                          <p className="text-xl font-black" style={{ color: secondary }}>
                            {ticket.priceType === 'free' ? 'GRÁTIS' : `R$ ${(ticket.priceCents / 100).toFixed(2).replace('.', ',')}`}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-black/5">
                          <span className="text-[10px] font-black text-black/40 uppercase tracking-widest">QTD</span>
                          <div className="flex items-center gap-3 bg-white shadow-sm border border-black/5 rounded-2xl p-1.5">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-black" onClick={() => updateQty(ticket.id, -1)}><Minus className="h-4 w-4" /></Button>
                            <span className="font-black text-lg min-w-[30px] text-center text-black">{quantities[ticket.id] || 0}</span>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-black" onClick={() => updateQty(ticket.id, 1)}><Plus className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>

                  <CardFooter className="p-10 pt-4 flex flex-col gap-6">
                    {totalItems > 0 && (
                      <div className="w-full flex justify-between items-center px-6 py-4 rounded-2xl border border-black/5 bg-black/[0.02]">
                        <span className="font-bold text-black/40 text-xs uppercase tracking-widest">SUBTOTAL</span>
                        <span className="font-black text-2xl text-black">R$ {(totalPrice / 100).toFixed(2).replace('.', ',')}</span>
                      </div>
                    )}
                    
                    <Button 
                      onClick={handleCheckout} 
                      className="w-full text-white font-black h-20 text-xl rounded-[2rem] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 uppercase tracking-widest" 
                      style={{ backgroundColor: primary, boxShadow: `0 20px 40px ${primary}40` }}
                      disabled={totalItems === 0}
                    >
                      {totalItems === 0 ? 'Selecione Ingressos' : 'GARANTIR MINHA VAGA'}
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </div>

          </section>
        </div>
      </main>

      <footer className={cn("py-12 border-t mt-20", isDark ? "border-white/10 text-white/30" : "border-black/5 text-black/30")}>
        <div className="container mx-auto px-4 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.3em]">© 2024 EventoMassa - Todos os direitos reservados</p>
        </div>
      </footer>
    </div>
  );
}