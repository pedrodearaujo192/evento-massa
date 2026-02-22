
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Navbar } from '@/components/navbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Calendar, Ticket, User, ArrowLeft, QrCode as QrCodeIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Image from 'next/image';

export default function OrderTicketsPage() {
  const { orderId } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);

  useEffect(() => {
    if (!orderId) return;

    async function fetchData() {
      try {
        const orderSnap = await getDoc(doc(db, 'pedidos', orderId as string));
        if (!orderSnap.exists()) {
          router.push('/');
          return;
        }
        const orderData = orderSnap.data();
        setOrder(orderData);

        const eventSnap = await getDoc(doc(db, 'eventos', orderData.eventId));
        if (eventSnap.exists()) setEvent({ id: eventSnap.id, ...eventSnap.data() });

        const ticketsQuery = query(collection(db, 'ingressos'), where('orderId', '==', orderId));
        const ticketsSnap = await getDocs(ticketsQuery);
        setTickets(ticketsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [orderId, router]);

  if (loading) return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
           <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" className="rounded-full shadow-sm" onClick={() => router.push('/')}><ArrowLeft className="h-4 w-4" /></Button>
              <div>
                 <h1 className="text-3xl font-black font-headline tracking-tight text-foreground">Meus Ingressos</h1>
                 <p className="text-muted-foreground text-xs uppercase tracking-widest font-bold">PEDIDO: {orderId}</p>
              </div>
           </div>
           <Badge variant="outline" className="border-primary/20 text-primary font-bold px-4 py-1 h-fit">
             {tickets.length} {tickets.length === 1 ? 'INGRESSO' : 'INGRESSOS'}
           </Badge>
        </div>

        <div className="flex flex-wrap gap-10 justify-center">
          {tickets.map((ticket, idx) => (
            <Card key={ticket.id} className="w-full max-w-[380px] border-none shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col bg-white rounded-3xl group">
               {/* Ticket Header: Imagem do Evento */}
               <div className="relative h-48 w-full">
                  <Image 
                    src={event?.coverUrl || "https://picsum.photos/seed/event/600/400"} 
                    alt="Capa do Evento" 
                    fill 
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6">
                    <Badge className="bg-primary text-white w-fit mb-2 shadow-lg">{ticket.ticketName}</Badge>
                    <h2 className="text-white font-black text-2xl font-headline leading-tight line-clamp-2">{event?.title}</h2>
                  </div>
               </div>
               
               {/* Ticket Body: Info Principal */}
               <div className="p-8 space-y-8 relative">
                  {/* Detalhes do Evento */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter">DATA DO EVENTO</p>
                      <p className="font-bold flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-primary" />
                        {event?.startAt ? format(event.startAt.toDate(), "dd/MM/yyyy", { locale: ptBR }) : '--/--/--'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter">HORÁRIO</p>
                      <p className="font-bold text-sm">
                        {event?.startAt ? format(event.startAt.toDate(), "HH:mm'h'", { locale: ptBR }) : '--:--'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter">TITULAR DO INGRESSO</p>
                    <p className="font-bold flex items-center gap-2 text-base text-foreground">
                      <User className="h-5 w-5 text-primary" />
                      {ticket.userName}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter">LOCALIZAÇÃO</p>
                    <p className="text-sm font-medium flex items-start gap-2 leading-tight">
                      <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{event?.address}, {event?.city} - {event?.state}</span>
                    </p>
                  </div>

                  {/* Divisória Serrilhada (Notches) */}
                  <div className="absolute -bottom-[1px] left-0 w-full flex items-center justify-between px-[-12px]">
                    <div className="w-6 h-6 bg-muted/30 rounded-full -ml-3 shadow-inner" />
                    <div className="flex-1 border-t-2 border-dashed border-muted-foreground/20 mx-1" />
                    <div className="w-6 h-6 bg-muted/30 rounded-full -mr-3 shadow-inner" />
                  </div>
               </div>

               {/* Ticket Stub: QR Code e Validação */}
               <div className="p-8 bg-muted/5 flex flex-col items-center justify-center space-y-6">
                  <div className="bg-white p-4 rounded-2xl shadow-xl border border-primary/5 transition-transform hover:scale-105 duration-300">
                     <Image 
                       src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${ticket.id}`} 
                       alt="QR Code Validação" 
                       width={180}
                       height={180}
                       className="object-contain"
                       priority
                     />
                  </div>
                  
                  <div className="text-center space-y-3">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">CÓDIGO DE VALIDAÇÃO</p>
                      <p className="font-mono text-[11px] font-bold text-foreground bg-muted/50 px-3 py-1 rounded-md border border-muted/50">{ticket.id}</p>
                    </div>
                    
                    <Button variant="secondary" size="sm" className="font-bold text-[11px] h-9 px-6 rounded-full shadow-lg shadow-secondary/20" asChild>
                       <a href={`https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${ticket.id}`} download target="_blank">
                         BAIXAR QR CODE
                       </a>
                    </Button>
                  </div>
               </div>
               
               {/* Decoração Final */}
               <div className="h-4 bg-primary/10 w-full" />
            </Card>
          ))}

          {tickets.length === 0 && (
            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-muted/50 w-full max-w-xl">
              <QrCodeIcon className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-10" />
              <p className="text-muted-foreground font-bold">Nenhum ingresso encontrado para este pedido.</p>
              <Button variant="link" onClick={() => router.push('/')}>Voltar para o início</Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
