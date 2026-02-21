'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { Order, Event, Ticket } from '@/lib/types';
import { Navbar } from '@/components/navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Ticket as TicketIcon, Calendar, MapPin, QrCode } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OrderWithEvent extends Order {
  event?: Event;
}

export default function MyEventsPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderWithEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'pedidos'), where('userId', '==', user.uid));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const ordersData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as OrderWithEvent));
      
      // Carregar dados dos eventos
      const enrichedOrders = await Promise.all(
        ordersData.map(async (order) => {
          const eventDoc = await getDoc(doc(db, 'eventos', order.eventId));
          return {
            ...order,
            event: eventDoc.exists() ? { id: eventDoc.id, ...eventDoc.data() } as Event : undefined
          };
        })
      );

      setOrders(enrichedOrders.sort((a, b) => b.criadoEm.toMillis() - a.criadoEm.toMillis()));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <div className="min-h-screen bg-muted/20">
      <Navbar />
      <main className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">Meus Eventos</h1>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg border-2 border-dashed">
            <TicketIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg mb-6">Você ainda não tem pedidos de ingressos.</p>
            <Link href="/">
              <Button>Explorar Eventos</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <Card key={order.id} className="overflow-hidden border-none shadow-sm">
                <div className="flex flex-col md:flex-row">
                  <div className="relative w-full md:w-64 h-40">
                    <Image 
                      src={order.event?.imagem_url || "https://picsum.photos/seed/event/600/400"} 
                      alt={order.event?.titulo || "Evento"} 
                      fill 
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant={order.status === 'pago' ? 'default' : 'outline'} className={order.status === 'pago' ? 'bg-secondary text-white' : ''}>
                          {order.status === 'pago' ? 'Pago' : order.status === 'pendente' ? 'Pendente' : 'Cancelado'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">Pedido: {order.id.slice(0, 8)}</span>
                      </div>
                      <h3 className="text-xl font-bold mb-2">{order.event?.titulo || 'Evento removido'}</h3>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{order.event ? format(new Date(order.event.data.replace(/-/g, '/')), "dd 'de' MMMM", { locale: ptBR }) : ''}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>{order.event?.cidade}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="font-bold text-lg">Total: R$ {order.total.toFixed(2).replace('.', ',')}</span>
                      <div className="flex gap-2">
                        {order.status === 'pago' && (
                          <Link href={`/ingressos/${order.id}`}>
                            <Button size="sm" className="bg-primary hover:bg-primary/90">
                              <QrCode className="mr-2 h-4 w-4" />
                              Ver Ingressos
                            </Button>
                          </Link>
                        )}
                        <Link href={`/evento/${order.eventId}`}>
                          <Button variant="outline" size="sm">Ver Evento</Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
