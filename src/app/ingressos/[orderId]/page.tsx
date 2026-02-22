'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Navbar } from '@/components/navbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Calendar, User, ArrowLeft, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Image from 'next/image';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useToast } from '@/hooks/use-toast';

// Helper para garantir que todas as imagens no elemento foram carregadas e decodificadas
async function waitForImages(root: HTMLElement) {
  const imgs = Array.from(root.querySelectorAll("img"));

  await Promise.all(
    imgs.map(async (img) => {
      // espera carregar
      if (!img.complete) {
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
      }

      // espera decodificar (isso evita "linhas cortadas" e falhas de renderização)
      try {
        if ('decode' in img) {
          await (img as any).decode();
        }
      } catch (e) {
        console.warn("Falha ao decodificar imagem para o PDF", e);
      }
    })
  );
}

// Helper para esperar o próximo frame de renderização
function nextFrame() {
  return new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  );
}

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
    toast({ title: 'Gerando PDF...', description: 'Processando seu ingresso em alta qualidade.' });

    try {
      // 1) Garante fontes e estabilização do layout
      if (typeof window !== 'undefined' && 'fonts' in document) {
        await (document as any).fonts.ready;
      }
      await nextFrame();

      // 2) Garante imagens carregadas e DECODIFICADAS
      await waitForImages(element);
      await nextFrame();

      // 3) Captura com ajustes finos no clone
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: 0,
        onclone: (doc) => {
          const cloned = doc.querySelector(`[data-ticket-id="${ticketId}"]`) as HTMLElement | null;
          if (!cloned) return;

          // Remove animações e efeitos de escala para evitar distorções no PDF
          cloned.querySelectorAll("*").forEach((el) => {
            const h = el as HTMLElement;
            if (h.style) {
              h.style.animation = "none";
              h.style.transition = "none";
              h.style.transform = "none";
            }
          });

          // Força uma "zona segura" pro texto do título não cortar
          const titles = cloned.querySelectorAll("h2");
          titles.forEach((h2) => {
            (h2 as HTMLElement).style.lineHeight = "1.2";
            (h2 as HTMLElement).style.paddingBottom = "4px";
          });
        },
      });

      // 4) Converte para JPEG (mais estável para evitar artefatos de "linhas cortadas" no banner)
      const imgData = canvas.toDataURL("image/jpeg", 0.98);

      // 5) Configuração do PDF A4
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      const margin = 10; // mm
      const maxW = pageW - margin * 2;
      const maxH = pageH - margin * 2;

      const ratio = canvas.height / canvas.width;

      let imgW = maxW;
      let imgH = imgW * ratio;

      // Se passar da altura máxima da página, reduz proporcionalmente
      if (imgH > maxH) {
        imgH = maxH;
        imgW = imgH / ratio;
      }

      const x = (pageW - imgW) / 2;
      const y = (pageH - imgH) / 2;

      // Adiciona a imagem sem o flag "FAST" para evitar baixa qualidade
      pdf.addImage(imgData, "JPEG", x, y, imgW, imgH);
      pdf.save(`ingresso-${ticketId}.pdf`);

      toast({ title: "Pronto!", description: "Seu ingresso foi baixado com sucesso." });
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast({ variant: "destructive", title: "Erro ao baixar", description: "Falha ao gerar o arquivo PDF." });
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
            <div key={ticket.id} className="flex flex-col gap-6 items-center max-w-[400px] w-full">
              {/* Card do Ingresso Vertical Profissional */}
              <Card 
                data-ticket-id={ticket.id}
                ref={(el) => { ticketRefs.current[ticket.id] = el; }}
                className="w-full border-none shadow-[0_30px_60px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col bg-white rounded-[2rem] relative"
              >
                {/* Imagem de Capa do Evento com Gradiente */}
                <div className="relative h-56 w-full">
                    <Image 
                      src={event?.coverUrl || "https://picsum.photos/seed/event/800/600"} 
                      alt="Capa do Evento" 
                      fill 
                      className="object-cover"
                      unoptimized 
                      crossOrigin="anonymous"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-end p-8">
                      <Badge 
                        className="!bg-primary !text-white !border-none !inline-flex !items-center !justify-center !h-7 !px-4 !py-0 !leading-none shadow-lg font-black uppercase text-[10px] tracking-widest mb-3"
                      >
                        <span style={{ lineHeight: "1" }}>{ticket.ticketName}</span>
                      </Badge>
                      <h2 className="text-white font-black text-2xl font-headline leading-[1.2] pb-1 line-clamp-2">
                        {event?.title}
                      </h2>
                    </div>
                </div>
                
                {/* Área de Informações */}
                <div className="p-8 space-y-8 bg-white relative">
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">DATA DO EVENTO</p>
                        <p className="font-bold flex items-center gap-2 text-sm text-foreground">
                          <Calendar className="h-4 w-4 text-primary" />
                          {event?.startAt ? format(event.startAt.toDate(), "dd/MM/yyyy", { locale: ptBR }) : '--/--/--'}
                        </p>
                      </div>
                      <div className="space-y-1 border-l pl-4">
                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">HORÁRIO</p>
                        <p className="font-bold text-sm text-foreground">
                          {event?.startAt ? format(event.startAt.toDate(), "HH:mm'h'", { locale: ptBR }) : '--:--'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">TITULAR DO INGRESSO</p>
                      <p className="font-bold flex items-center gap-3 text-base text-foreground bg-muted/20 p-3 rounded-xl border border-muted/50">
                        <User className="h-5 w-5 text-primary" />
                        {ticket.userName}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">LOCALIZAÇÃO</p>
                      <p className="text-sm font-medium flex items-start gap-2 leading-snug text-muted-foreground">
                        <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span>{event?.address}, {event?.city} - {event?.state}</span>
                      </p>
                    </div>

                    {/* Linha Serrilhada de Recorte */}
                    <div className="absolute -bottom-[20px] left-0 w-full flex items-center justify-between z-10">
                      <div className="w-8 h-8 bg-muted/30 rounded-full -ml-4" />
                      <div className="flex-1 border-t-2 border-dashed border-muted-foreground/30 mx-2" />
                      <div className="w-8 h-8 bg-muted/30 rounded-full -mr-4" />
                    </div>
                </div>

                {/* Área do QR Code com Fundo Destacado */}
                <div className="p-10 bg-muted/5 flex flex-col items-center justify-center space-y-6 pt-12">
                    <div className="bg-white p-5 rounded-3xl shadow-2xl border-4 border-white">
                       <Image 
                         src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${ticket.id}`} 
                         alt="QR Code Validação" 
                         width={180}
                         height={180}
                         className="object-contain"
                         unoptimized
                         crossOrigin="anonymous"
                       />
                    </div>
                    
                    <div className="text-center space-y-2">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">IDENTIFICADOR ÚNICO</p>
                      <p className="font-mono text-xs font-bold text-primary bg-primary/5 px-4 py-2 rounded-lg border border-primary/10 tracking-wider">
                        #{ticket.id.toUpperCase()}
                      </p>
                    </div>
                </div>
                
                <div className="h-4 bg-primary w-full" />
              </Card>

              {/* Botão de Download PDF */}
              <Button 
                onClick={() => handleDownloadPDF(ticket.id)}
                disabled={downloadingId === ticket.id}
                className="w-full bg-secondary hover:bg-secondary/90 text-white font-black h-14 rounded-2xl shadow-xl shadow-secondary/20 transition-all active:scale-95 text-lg"
              >
                {downloadingId === ticket.id ? (
                  <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                ) : (
                  <FileText className="mr-3 h-6 w-6" />
                )}
                BAIXAR INGRESSO (PDF)
              </Button>
            </div>
          ))}

          {tickets.length === 0 && (
            <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-muted/50 w-full max-w-xl shadow-sm">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-10" />
              <p className="text-muted-foreground font-bold">Nenhum ingresso encontrado para este pedido.</p>
              <Button variant="link" onClick={() => router.push('/')}>Voltar para o início</Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
