'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, Calendar, MapPin, Ticket, Info, Minus, Plus } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

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

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  if (!event) return null;

  return (
    <div className="min-h-screen bg-muted/10">
      <Navbar />
      
      <div className="relative h-[300px] md:h-[450px]">
        <Image src={event.coverUrl || "https://picsum.photos/seed/1/1200/600"} alt={event.title} fill className="object-cover" />
        <div className="absolute inset-0 bg-black/60 flex items-end">
          <div className="container mx-auto px-4 pb-8">
             <Badge className="bg-primary text-white mb-4">{event.category}</Badge>
             <h1 className="text-3xl md:text-5xl font-black text-white font-headline leading-tight">{event.title}</h1>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card className="border-none shadow-sm">
              <CardHeader><CardTitle className="font-headline text-2xl">Sobre o Evento</CardTitle></CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">{event.description}</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader><CardTitle className="font-headline text-2xl">Localização</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <p className="font-bold">{event.address}</p>
                    <p className="text-muted-foreground">{event.city}, {event.state}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
             <Card className="border-primary border-2 shadow-lg sticky top-24">
                <CardHeader className="bg-primary/5 border-b">
                  <CardTitle className="flex items-center gap-2"><Ticket className="h-5 w-5 text-primary" /> Ingressos</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {tickets.map(ticket => (
                      <div key={ticket.id} className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold">{ticket.name}</p>
                            <p className="text-xs text-muted-foreground">{ticket.description}</p>
                          </div>
                          <p className="font-black text-primary">
                            {ticket.priceType === 'free' ? 'GRÁTIS' : `R$ ${(ticket.priceCents / 100).toFixed(2)}`}
                          </p>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Qtd desejada</span>
                          <div className="flex items-center gap-3 bg-muted rounded-lg p-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQty(ticket.id, -1)}><Minus className="h-4 w-4" /></Button>
                            <span className="font-bold min-w-[20px] text-center">{quantities[ticket.id] || 0}</span>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQty(ticket.id, 1)}><Plus className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {tickets.length === 0 && <div className="p-8 text-center text-muted-foreground">Nenhum ingresso disponível.</div>}
                  </div>
                </CardContent>
                <CardFooter className="p-6 flex flex-col gap-4 border-t bg-muted/5">
                   <div className="flex justify-between w-full font-black text-lg">
                      <span>Total</span>
                      <span>R$ {(totalPrice / 100).toFixed(2).replace('.', ',')}</span>
                   </div>
                   <Button onClick={handleCheckout} className="w-full bg-secondary hover:bg-secondary/90 text-white font-bold h-12" disabled={totalItems === 0}>
                     GARANTIR MEU LUGAR
                   </Button>
                </CardFooter>
             </Card>

             <Card className="border-none shadow-sm">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-primary" />
                    <div>
                      <p className="font-bold">Início</p>
                      <p className="text-muted-foreground">{event.startAt ? format(event.startAt.toDate(), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR }) : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Info className="h-4 w-4 text-primary" />
                    <div>
                      <p className="font-bold">Capacidade</p>
                      <p className="text-muted-foreground">{event.capacity} participantes</p>
                    </div>
                  </div>
                </CardContent>
             </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
