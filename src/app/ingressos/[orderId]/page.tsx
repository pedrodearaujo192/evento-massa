
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Navbar } from '@/components/navbar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Download, MapPin, Calendar, Ticket, User, ArrowLeft, QrCode as QrCodeIcon } from 'lucide-react';
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
        if (eventSnap.exists()) setEvent(eventSnap.data());

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

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-muted/20 pb-20">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
           <Button variant="outline" size="icon" onClick={() => router.push('/')}><ArrowLeft className="h-4 w-4" /></Button>
           <div>
              <h1 className="text-3xl font-black font-headline">Meus Ingressos</h1>
              <p className="text-muted-foreground text-sm uppercase tracking-wider font-bold">PEDIDO: {orderId}</p>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
           <div className="lg:col-span-1">
              <Card className="border-none shadow-sm overflow-hidden sticky top-24">
                 <div className="relative aspect-video">
                    <Image src={event?.coverUrl || "https://picsum.photos/seed/event/600/400"} alt="Evento" fill className="object-cover" />
                 </div>
                 <CardContent className="p-4 space-y-4">
                    <h2 className="font-black text-xl font-headline leading-tight">{event?.title}</h2>
                    <div className="space-y-2 text-sm text-muted-foreground">
                       <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> {event?.startAt ? format(event.startAt.toDate(), "dd 'de' MMMM", { locale: ptBR }) : ''}</div>
                       <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> {event?.city}, {event?.state}</div>
                    </div>
                 </CardContent>
              </Card>
           </div>

           <div className="lg:col-span-3 space-y-6">
              {tickets.map((ticket, idx) => (
                <Card key={ticket.id} className="border-none shadow-xl overflow-hidden flex flex-col md:flex-row">
                   <div className="p-6 md:p-8 flex-1 space-y-6 border-b md:border-b-0 md:border-r border-dashed border-muted-foreground/30 relative">
                      {/* Ticket Decoration */}
                      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-8 h-8 bg-muted/20 rounded-full hidden md:block" />
                      <div className="absolute bottom-0 right-0 translate-y-1/2 translate-x-1/2 w-8 h-8 bg-muted/20 rounded-full hidden md:block" />
                      
                      <div className="flex justify-between items-start">
                         <div>
                            <Badge className="bg-secondary text-white mb-2">{ticket.ticketName}</Badge>
                            <h3 className="text-2xl font-black font-headline">{event?.title}</h3>
                         </div>
                         <div className="text-right">
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">INGRESSO</p>
                            <p className="font-mono text-sm font-bold">#{idx + 1}/{tickets.length}</p>
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-1">
                            <p className="text-[10px] text-muted-foreground font-bold uppercase">TITULAR</p>
                            <p className="font-bold flex items-center gap-2"><User className="h-4 w-4 text-primary" /> {ticket.userName}</p>
                         </div>
                         <div className="space-y-1">
                            <p className="text-[10px] text-muted-foreground font-bold uppercase">STATUS</p>
                            <Badge variant={ticket.status === 'ativo' ? 'outline' : 'default'} className={ticket.status === 'ativo' ? 'border-green-500 text-green-600' : 'bg-green-500'}>
                               {ticket.status === 'ativo' ? 'VÁLIDO' : 'USADO'}
                            </Badge>
                         </div>
                      </div>

                      <div className="pt-4 border-t border-muted/50 flex justify-between items-center text-xs text-muted-foreground">
                         <div className="flex items-center gap-2"><Ticket className="h-4 w-4" /> Apresente este ingresso na entrada</div>
                         <div className="font-mono">ID: {ticket.id}</div>
                      </div>
                   </div>

                   <div className="bg-white p-6 md:p-8 flex flex-col items-center justify-center gap-4 min-w-[200px]">
                      <div className="relative w-32 h-32 md:w-40 md:h-40 border-2 border-primary/10 p-2 rounded-xl">
                         <Image 
                           src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${ticket.id}`} 
                           alt="QR Code" 
                           fill 
                           className="object-contain"
                         />
                      </div>
                      <p className="text-[10px] font-mono text-muted-foreground text-center">VALIDAÇÃO DIGITAL EXCLUSIVA</p>
                      <Button variant="ghost" size="sm" className="text-[10px] h-8" asChild>
                         <a href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${ticket.id}`} download target="_blank">
                           <Download className="mr-2 h-3 w-3" /> SALVAR QR CODE
                         </a>
                      </Button>
                   </div>
                </Card>
              ))}

              {tickets.length === 0 && (
                <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed">
                  <QrCodeIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-20" />
                  <p className="text-muted-foreground">Seus ingressos estão sendo gerados...</p>
                </div>
              )}
           </div>
        </div>
      </main>
    </div>
  );
}
