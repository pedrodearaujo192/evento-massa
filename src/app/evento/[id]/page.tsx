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
import { cn } from '@/lib/utils';

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
      
      {/* Hero Section Dynamic */}
      <section className="relative min-h-[600px] flex items-center pt-10 pb-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image 
            src={event.coverUrl || "https://picsum.photos/seed/bg/1920/1080"} 
            alt={event.title} 
            fill 
            className={cn("object-cover opacity-40", isDark ? "grayscale" : "")}
            priority
          />
          <div className={cn("absolute inset-0", isDark ? "bg-gradient-to-t from-black via-black/80 to-black/40" : "bg-gradient-to-t from-white via-white/80 to-white/40")} />
          {/* Dynamic Accents */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[120px] animate-pulse opacity-20" style={{ backgroundColor: primary }} />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full blur-[100px] animate-pulse opacity-10" style={{ backgroundColor: secondary }} />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-end">
            <div className="lg:col-span-8 space-y-8">
              <div className="flex flex-wrap gap-3">
                <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full shadow-lg" style={{ backgroundColor: primary }}>
                  <span className="text-[10px] font-black tracking-widest uppercase text-white">{event.category}</span>
                </div>
                {event.sector && (
                  <div className={cn("inline-flex items-center px-5 py-2 rounded-full backdrop-blur-md border", isDark ? "bg-white/10 border-white/10" : "bg-black/5 border-black/10")}>
                    <span className={cn("text-[10px] font-black tracking-widest uppercase", isDark ? "text-white/70" : "text-black/70")}>{event.sector}</span>
                  </div>
                )}
              </div>

              <h1 className={cn("text-4xl md:text-7xl font-black font-headline leading-[1.1] tracking-tight uppercase drop-shadow-2xl", isDark ? "text-white" : "text-black")}>
                {event.title}
              </h1>

              <div className="flex flex-wrap gap-8 pt-4">
                 <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg border" style={{ backgroundColor: `${primary}33`, borderColor: `${primary}55` }}><Calendar className="h-5 w-5" style={{ color: primary }} /></div>
                    <div>
                      <p className={cn("text-[10px] font-bold uppercase tracking-widest", isDark ? "text-white/40" : "text-black/40")}>DATA E HORA</p>
                      <p className="font-black text-sm">{event.startAt ? format(event.startAt.toDate(), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR }) : ''}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg border" style={{ backgroundColor: `${secondary}33`, borderColor: `${secondary}55` }}><MapPinned className="h-5 w-5" style={{ color: secondary }} /></div>
                    <div>
                      <p className={cn("text-[10px] font-bold uppercase tracking-widest", isDark ? "text-white/40" : "text-black/40")}>LOCAL DO EVENTO</p>
                      <p className="font-black text-sm">{event.city} - {event.state}</p>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Dynamic */}
      <main className="container mx-auto px-4 -mt-20 relative z-20 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          <div className="lg:col-span-8 space-y-12">
            {embedUrl && (
              <div className={cn("backdrop-blur-xl border rounded-[2.5rem] overflow-hidden shadow-2xl", isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10")}>
                <div className={cn("p-8 border-b flex items-center justify-between", isDark ? "border-white/10 bg-white/[0.02]" : "border-black/5 bg-black/[0.02]")}>
                  <div className="flex items-center gap-3">
                    <div className="bg-red-600 p-2 rounded-lg"><Youtube className="h-5 w-5 text-white" /></div>
                    <h2 className="text-xl font-black font-headline uppercase tracking-tight">Vídeo de Apresentação</h2>
                  </div>
                </div>
                <div className="aspect-video bg-black relative">
                  <iframe width="100%" height="100%" src={embedUrl} title="Apresentação" frameBorder="0" allowFullScreen className="absolute inset-0" />
                </div>
              </div>
            )}

            <div className={cn("backdrop-blur-xl border rounded-[2.5rem] p-10 space-y-8 shadow-2xl", isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10")}>
              <div className={cn("flex items-center gap-4 border-b pb-6", isDark ? "border-white/10" : "border-black/5")}>
                <div className="p-3 rounded-2xl" style={{ backgroundColor: primary }}><Info className="h-6 w-6 text-white" /></div>
                <h2 className="text-2xl font-black font-headline uppercase tracking-tight">Sobre a Experiência</h2>
              </div>
              <p className={cn("whitespace-pre-wrap leading-relaxed text-lg font-medium italic", isDark ? "text-white/70" : "text-black/70")}>
                {event.description}
              </p>
              
              {event.tags && event.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-6">
                   {event.tags.map((tag: string) => (
                     <span key={tag} className={cn("flex items-center gap-2 text-[10px] font-black uppercase tracking-widest border px-4 py-2 rounded-full", isDark ? "text-white/50 bg-white/5 border-white/10" : "text-black/50 bg-black/5 border-black/10")}>
                       <Tag className="h-3 w-3" style={{ color: primary }} /> {tag}
                     </span>
                   ))}
                </div>
              )}
            </div>

            <div className={cn("backdrop-blur-xl border rounded-[2.5rem] p-10 space-y-8 shadow-2xl", isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10")}>
                <div className={cn("flex items-center justify-between border-b pb-6", isDark ? "border-white/10" : "border-black/5")}>
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl" style={{ backgroundColor: secondary }}><MapPin className="h-6 w-6 text-white" /></div>
                    <h2 className="text-2xl font-black font-headline uppercase tracking-tight">LOCALIZAÇÃO</h2>
                  </div>
                </div>
                <div className={cn("p-6 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4", isDark ? "bg-white/5 border-white/5" : "bg-black/5 border-black/5")}>
                    <div>
                      <p className="font-black text-xl">{event.address}</p>
                      <p className={cn("font-medium", isDark ? "text-white/50" : "text-black/50")}>{event.city}, {event.state}</p>
                    </div>
                    {event.mapUrl && (
                      <Button className="h-14 px-8 rounded-xl gap-3 font-black transition-all active:scale-95" style={{ backgroundColor: primary, color: '#fff' }} asChild>
                        <a href={event.mapUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-5 w-5" /> VER NO MAPA
                        </a>
                      </Button>
                    )}
                </div>
            </div>
          </div>

          <div className="lg:col-span-4 lg:-mt-64 relative">
             <div className="sticky top-24 space-y-6">
                <Card className="bg-white rounded-[3rem] overflow-hidden border-none shadow-[0_50px_100px_rgba(0,0,0,0.3)]">
                  <CardHeader className="bg-white pt-10 pb-6 px-10">
                    <CardTitle className="text-3xl font-black font-headline text-black italic">Ingressos</CardTitle>
                    <div className="h-1 w-20 mt-4 rounded-full" style={{ backgroundColor: `${primary}22` }} />
                  </CardHeader>

                  <CardContent className="px-10 pb-10 pt-4 space-y-6">
                    {tickets.map(ticket => (
                      <div key={ticket.id} className="p-6 bg-muted/20 rounded-[2rem] border border-transparent hover:border-muted-foreground/10 transition-all">
                        <div className="flex justify-between items-start mb-4">
                          <div className="space-y-1">
                            <p className="font-black text-black text-lg uppercase leading-none">{ticket.name}</p>
                            <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest">{ticket.description || 'Acesso ao Evento'}</p>
                          </div>
                          <p className="text-xl font-black" style={{ color: secondary }}>
                            {ticket.priceType === 'free' ? 'GRÁTIS' : `R$ ${(ticket.priceCents / 100).toFixed(2).replace('.', ',')}`}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-black/5">
                          <span className="text-[10px] font-black text-black/40 uppercase tracking-widest">Quantidade</span>
                          <div className="flex items-center gap-3 bg-white shadow-sm border rounded-2xl p-1.5">
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-black" onClick={() => updateQty(ticket.id, -1)}><Minus className="h-5 w-5" /></Button>
                            <span className="font-black text-lg min-w-[30px] text-center text-black">{quantities[ticket.id] || 0}</span>
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-black" onClick={() => updateQty(ticket.id, 1)}><Plus className="h-5 w-5" /></Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>

                  <CardFooter className="px-10 pb-10 pt-0">
                    <div className="w-full space-y-6">
                       {totalItems > 0 && (
                         <div className="flex justify-between items-center px-4 py-4 rounded-2xl border" style={{ backgroundColor: `${secondary}08`, borderColor: `${secondary}15` }}>
                            <span className="font-bold text-black/50 text-sm uppercase tracking-widest">Subtotal</span>
                            <span className="font-black text-2xl text-black">R$ {(totalPrice / 100).toFixed(2).replace('.', ',')}</span>
                         </div>
                       )}
                       
                       <Button 
                        onClick={handleCheckout} 
                        className="w-full text-white font-black h-20 text-xl rounded-[2rem] transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest" 
                        style={{ backgroundColor: primary, boxShadow: `0 20px 40px ${primary}44` }}
                        disabled={totalItems === 0}
                       >
                         {totalItems === 0 ? 'SELECIONE UM LOTE' : 'COMPRAR AGORA'}
                       </Button>
                    </div>
                  </CardFooter>
                </Card>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}
