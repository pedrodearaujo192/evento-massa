
'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle2, ArrowRight, Ticket } from 'lucide-react';
import { Navbar } from '@/components/navbar';

function SucessoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('orderId');

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8 space-y-6 shadow-2xl border-none">
          <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black font-headline">Pagamento Recebido!</h1>
            <p className="text-muted-foreground">
              Seu pedido <span className="font-mono text-primary font-bold">#{orderId?.slice(-6).toUpperCase()}</span> foi processado.
            </p>
          </div>
          
          <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 space-y-4">
            <p className="text-sm font-medium">Os seus ingressos já estão disponíveis na sua área logada e também foram enviados para o seu e-mail.</p>
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

import { Loader2 } from 'lucide-react';
