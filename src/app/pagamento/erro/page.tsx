
'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { Navbar } from '@/components/navbar';

function ErroContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('orderId');

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8 space-y-6 shadow-2xl border-none">
          <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-12 w-12 text-red-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black font-headline">Ops! Algo deu errado.</h1>
            <p className="text-muted-foreground">
              Não conseguimos processar o seu pagamento no Mercado Pago.
            </p>
          </div>
          
          <div className="bg-red-50 p-6 rounded-2xl border border-red-100 space-y-4">
            <p className="text-sm text-red-700">O seu pedido ainda está salvo, você pode tentar realizar o pagamento novamente.</p>
            <Button onClick={() => router.back()} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-12">
              <ArrowLeft className="mr-2 h-4 w-4" /> TENTAR NOVAMENTE
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

export default function PagamentoErroPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>}>
      <ErroContent />
    </Suspense>
  );
}

import { Loader2 } from 'lucide-react';
