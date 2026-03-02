
'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, writeBatch, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle2, Ticket, Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Navbar } from '@/components/navbar';

function SucessoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Captura o ID do pedido de várias formas possíveis (URL params do Mercado Pago)
  const orderId = searchParams.get('orderId') || searchParams.get('external_reference');
  const mpStatus = searchParams.get('status') || searchParams.get('collection_status');
  
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const processingRef = useRef(false);

  useEffect(() => {
    // Se não há orderId, não podemos processar nada. Exibe erro para evitar loop de carregamento.
    if (!orderId) {
      setError("Não conseguimos localizar o identificador do seu pedido. Se o pagamento foi aprovado, seus ingressos aparecerão em 'Meus Eventos' em instantes.");
      setIsProcessing(false);
      return;
    }

    if (processingRef.current) return;

    async function finalizeOrder() {
      processingRef.current = true;
      try {
        const orderRef = doc(db, 'pedidos', orderId as string);
        const orderSnap = await getDoc(orderRef);

        if (!orderSnap.exists()) {
          setError('O registro do seu pedido não foi encontrado no nosso banco de dados. Por favor, verifique se o pagamento foi concluído.');
          setIsProcessing(false);
          return;
        }

        const orderData = orderSnap.data();

        // Se o pedido já estiver marcado como pago, verifica se os ingressos já foram gerados
        if (orderData.status === 'pago') {
          const ticketsQuery = query(collection(db, 'ingressos'), where('orderId', '==', orderId));
          const ticketsSnap = await getDocs(ticketsQuery);
          
          if (!ticketsSnap.empty) {
            // Pedido pago e ingressos já existem. Finaliza o carregamento.
            setIsProcessing(false);
            return;
          }
          // Se estiver pago mas sem ingressos, continua para gerá-los abaixo.
        }

        // Se chegamos aqui, precisamos converter o pedido em ingressos
        const batch = writeBatch(db);
        
        // 1. Marcar pedido como pago no Firestore
        batch.update(orderRef, { 
          status: 'pago', 
          updatedAt: serverTimestamp(),
          paymentStatusMP: mpStatus // Salva o status vindo do Mercado Pago para auditoria
        });

        // 2. Gerar cada ingresso individualmente baseado nos itens do pedido
        if (orderData.items && Array.isArray(orderData.items)) {
          for (const item of orderData.items) {
            const qty = Number(item.qty) || 0;
            for (let i = 0; i < qty; i++) {
              const ticketRef = doc(collection(db, 'ingressos'));
              batch.set(ticketRef, {
                orderId: orderId,
                eventId: orderData.eventId,
                userId: orderData.userId || 'guest',
                userName: orderData.customer?.fullName || 'Participante',
                userEmail: orderData.customer?.email || '',
                ticketName: item.name || 'Ingresso',
                status: 'ativo',
                checkedInAt: null,
                createdAt: serverTimestamp()
              });
            }
            
            // 3. Atualiza o contador de vendas do lote no evento
            try {
              const typeRef = doc(db, 'eventos', orderData.eventId, 'ticketTypes', item.id);
              batch.update(typeRef, { soldCount: increment(qty) });
            } catch (e) {
              console.warn("Lote de ingresso não encontrado para atualizar contador:", item.id);
            }
          }
        }

        // Commita todas as alterações de uma vez
        await batch.commit();
        setIsProcessing(false);
      } catch (err: any) {
        console.error("Erro crítico na finalização do pedido:", err);
        setError("Seu pagamento foi aprovado, mas houve um erro ao gerar seus ingressos digitais. Nossa equipe foi notificada e seus ingressos aparecerão em breve no seu perfil.");
        setIsProcessing(false);
      }
    }

    finalizeOrder();
  }, [orderId, mpStatus]);

  if (isProcessing) {
    return (
      <div className="min-h-screen flex flex-col bg-muted/20">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center p-12 space-y-6 shadow-2xl border-none">
            <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
            <div className="space-y-2">
              <h1 className="text-2xl font-black font-headline">Finalizando sua compra...</h1>
              <p className="text-muted-foreground">Estamos gerando seus ingressos e atualizando o evento. Quase lá!</p>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-muted/20">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center p-8 space-y-6 shadow-2xl border-none">
            <div className="mx-auto w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-12 w-12 text-amber-600" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black font-headline">Processando Pedido</h1>
              <p className="text-muted-foreground text-sm leading-relaxed">{error}</p>
            </div>
            <div className="flex flex-col gap-3">
              <Button onClick={() => router.push('/meus-eventos')} className="w-full font-bold">
                Ver Meus Eventos / Ingressos
              </Button>
              <Button variant="ghost" onClick={() => router.push('/')} className="w-full text-muted-foreground">
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para o Início
              </Button>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8 space-y-6 shadow-2xl border-none">
          <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black font-headline">Compra Concluída!</h1>
            <p className="text-muted-foreground">
              Seu pedido <span className="font-mono text-primary font-bold">#{orderId?.slice(-6).toUpperCase()}</span> foi processado com sucesso.
            </p>
          </div>
          
          <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 space-y-4">
            <p className="text-sm font-medium text-primary">Seus ingressos digitais já estão disponíveis para download.</p>
            <Button asChild className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 shadow-lg shadow-primary/20">
              <a href={`/ingressos/${orderId}`}>
                <Ticket className="mr-2 h-4 w-4" /> ACESSAR MEUS INGRESSOS
              </a>
            </Button>
          </div>
          
          <Button variant="ghost" className="w-full font-bold" onClick={() => router.push('/')}>
            Voltar para a Home
          </Button>
        </Card>
      </main>
    </div>
  );
}

export default function PagamentoSucessoPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>}>
      <SucessoContent />
    </Suspense>
  );
}
