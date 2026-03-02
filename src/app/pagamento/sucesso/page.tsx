
'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, writeBatch, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle2, Ticket, Loader2, AlertTriangle } from 'lucide-react';
import { Navbar } from '@/components/navbar';
import { useToast } from '@/hooks/use-toast';

function SucessoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const orderId = searchParams.get('orderId') || searchParams.get('external_reference');
  
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const processingRef = useRef(false);

  useEffect(() => {
    if (!orderId || processingRef.current) return;

    async function finalizeOrder() {
      processingRef.current = true;
      try {
        const orderRef = doc(db, 'pedidos', orderId as string);
        const orderSnap = await getDoc(orderRef);

        if (!orderSnap.exists()) {
          setError('Pedido não encontrado no sistema.');
          setIsProcessing(false);
          return;
        }

        const orderData = orderSnap.data();

        // Se o pedido já estiver pago, verificamos se os ingressos existem
        if (orderData.status === 'pago') {
          const ticketsQuery = query(collection(db, 'ingressos'), where('orderId', '==', orderId));
          const ticketsSnap = await getDocs(ticketsQuery);
          
          if (ticketsSnap.empty) {
            // Se está pago mas não tem ingressos, vamos gerá-los (fallthrough para a lógica abaixo)
            console.log("Pedido pago mas sem ingressos. Gerando...");
          } else {
            setIsProcessing(false);
            return;
          }
        }

        // Finalizar Pedido e Gerar Ingressos
        const batch = writeBatch(db);
        
        // 1. Marcar como pago
        batch.update(orderRef, { status: 'pago', updatedAt: serverTimestamp() });

        // 2. Gerar Ingressos individuais
        for (const item of orderData.items) {
          for (let i = 0; i < item.qty; i++) {
            const ticketRef = doc(collection(db, 'ingressos'));
            batch.set(ticketRef, {
              orderId: orderId,
              eventId: orderData.eventId,
              userId: orderData.userId,
              userName: orderData.customer.fullName,
              userEmail: orderData.customer.email,
              ticketName: item.name,
              status: 'ativo',
              checkedInAt: null,
              createdAt: serverTimestamp()
            });
          }
          
          // 3. Atualizar contador de vendas do lote
          const typeRef = doc(db, 'eventos', orderData.eventId, 'ticketTypes', item.id);
          batch.update(typeRef, { soldCount: increment(item.qty) });
        }

        await batch.commit();
        setIsProcessing(false);
      } catch (err: any) {
        console.error("Erro ao finalizar pedido:", err);
        setError("Ocorreu um erro ao processar seus ingressos. Mas não se preocupe, seu pagamento foi registrado.");
        setIsProcessing(false);
      }
    }

    finalizeOrder();
  }, [orderId]);

  if (isProcessing) {
    return (
      <div className="min-h-screen flex flex-col bg-muted/20">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center p-12 space-y-6 shadow-2xl border-none">
            <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
            <div className="space-y-2">
              <h1 className="text-2xl font-black font-headline">Gerando seus ingressos...</h1>
              <p className="text-muted-foreground">Aguarde um instante enquanto processamos sua compra.</p>
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
            <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto" />
            <div className="space-y-2">
              <h1 className="text-2xl font-black font-headline">Quase lá!</h1>
              <p className="text-muted-foreground">{error}</p>
            </div>
            <Button onClick={() => router.push('/meus-eventos')} className="w-full">
              Ver Meus Eventos
            </Button>
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
            <h1 className="text-3xl font-black font-headline">Pagamento Confirmado!</h1>
            <p className="text-muted-foreground">
              Seu pedido <span className="font-mono text-primary font-bold">#{orderId?.slice(-6).toUpperCase()}</span> foi finalizado com sucesso.
            </p>
          </div>
          
          <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 space-y-4">
            <p className="text-sm font-medium text-primary">Seus ingressos já estão prontos para uso!</p>
            <Button asChild className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12">
              <a href={`/ingressos/${orderId}`}>
                <Ticket className="mr-2 h-4 w-4" /> VER MEUS INGRESSOS
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
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>}>
      <SucessoContent />
    </Suspense>
  );
}
