
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Navbar } from '@/components/navbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Calendar, User, ArrowLeft, Download, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Image from 'next/image';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useToast } from '@/hooks/use-toast';

export default function OrderTicketsPage() {
  const { orderId } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const ticketRefs = useRef<Record<string, HTMLDivElement | null>>({});

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

  const handleDownloadPDF = async (ticketId: string) => {
    const element = ticketRefs.current[ticketId];
    if (!element) return;

    setDownloadingId(ticketId);
    toast({ title: 'Gerando ingresso...', description: 'Aguarde um momento.' });

    try {
      // Captura o elemento como canvas
      const canvas = await html2canvas(element, {
        scale: 2, // Aumenta a qualidade
        useCORS: true, // Necessário para imagens de outros domínios (Firebase/Picsum)
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Calcula as dimensões para caber no A4 centralizado
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      const marginX = (pdfWidth - (pdfWidth * 0.8)) / 2;
      const finalWidth = pdfWidth * 0.8;
      const finalHeight = (imgProps.height * finalWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', marginX, 10, finalWidth, finalHeight);
      pdf.save(`ingresso-${ticketId}.pdf`);

      toast({ title: 'Sucesso!', description: 'Seu ingresso foi baixado.' });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({ variant: 'destructive', title: 'Erro ao baixar', description: 'Não foi possível gerar o PDF agora.' });
    } finally {
      setDownloadingId(null);
    }
  };

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

        <div className="flex flex-wrap gap-12 justify-center">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="flex flex-col gap-4 items-center max-w-[380px] w-full">
              {/* O Card do Ingresso com Ref para captura */}
              <Card 
                ref={(el) => { ticketRefs.current[ticket.id] = el; }}
                className="w-full border-none shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col bg-white rounded-3xl group"
              >
                {/* Cabeçalho com Imagem */}
                <div className="relative h-48 w-full">
                    <Image 
                      src={event?.coverUrl || "https://picsum.photos/seed/event/600/400"} 
                      alt="Capa do Evento" 
                      fill 
                      className="object-cover"
                      unoptimized // Ajuda com CORS no html2canvas
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6">
                      <Badge className="bg-primary text-white w-fit mb-2 shadow-lg">{ticket.ticketName}</Badge>
                      <h2 className="text-white font-black text-2xl font-headline leading-tight line-clamp-2">{event?.title}</h2>
                    </div>
                </div>
                
                {/* Corpo do Ingresso */}
                <div className="p-8 space-y-8 relative">
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

                    {/* Divisória Serrilhada */}
                    <div className="absolute -bottom-[1px] left-0 w-full flex items-center justify-between">
                      <div className="w-6 h-6 bg-muted/30 rounded-full -ml-3 shadow-inner" />
                      <div className="flex-1 border-t-2 border-dashed border-muted-foreground/20 mx-1" />
                      <div className="w-6 h-6 bg-muted/30 rounded-full -mr-3 shadow-inner" />
                    </div>
                </div>

                {/* QR Code Stub */}
                <div className="p-8 bg-muted/5 flex flex-col items-center justify-center space-y-6">
                    <div className="bg-white p-4 rounded-2xl shadow-xl border border-primary/5">
                       <Image 
                         src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${ticket.id}`} 
                         alt="QR Code Validação" 
                         width={160}
                         height={160}
                         className="object-contain"
                         unoptimized
                       />
                    </div>
                    
                    <div className="text-center space-y-2">
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">CÓDIGO ÚNICO</p>
                      <p className="font-mono text-[11px] font-bold text-foreground bg-muted/50 px-3 py-1 rounded-md border border-muted/50">{ticket.id}</p>
                    </div>
                </div>
                
                <div className="h-3 bg-primary/10 w-full" />
              </Card>

              {/* Botão de Download PDF individual */}
              <Button 
                onClick={() => handleDownloadPDF(ticket.id)}
                disabled={downloadingId === ticket.id}
                className="w-full bg-secondary hover:bg-secondary/90 text-white font-black h-12 rounded-2xl shadow-lg shadow-secondary/20 transition-all active:scale-95"
              >
                {downloadingId === ticket.id ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <FileText className="mr-2 h-5 w-5" />
                )}
                BAIXAR INGRESSO (PDF)
              </Button>
            </div>
          ))}

          {tickets.length === 0 && (
            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-muted/50 w-full max-w-xl">
              <Download className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-10" />
              <p className="text-muted-foreground font-bold">Nenhum ingresso encontrado para este pedido.</p>
              <Button variant="link" onClick={() => router.push('/')}>Voltar para o início</Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
