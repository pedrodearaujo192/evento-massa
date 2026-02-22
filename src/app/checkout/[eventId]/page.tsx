
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, serverTimestamp, writeBatch, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ArrowLeft, ShieldCheck, CheckCircle2, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { createPayment } from '@/ai/flows/create-payment-flow';

export default function CheckoutPage() {
  const { eventId } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [event, setEvent] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<any>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    document: '',
    email: '',
    address: '',
    city: '',
    zip: ''
  });

  useEffect(() => {
    const savedItems = localStorage.getItem('checkout_items');
    const savedTotal = localStorage.getItem('checkout_total');
    
    if (!savedItems || !eventId) {
      router.push('/');
      return;
    }

    setItems(JSON.parse(savedItems));
    setTotal(Number(savedTotal));

    async function loadEvent() {
      const docSnap = await getDoc(doc(db, 'eventos', eventId as string));
      if (docSnap.exists()) setEvent({ id: docSnap.id, ...docSnap.data() });
      setLoading(false);
    }
    loadEvent();
  }, [eventId, router]);

  const maskDocument = (value: string) => {
    const clean = value.replace(/\D/g, '');
    if (clean.length <= 11) {
      return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4').substring(0, 14);
    }
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5').substring(0, 18);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'document' ? maskDocument(value) : value
    }));
  };

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.document || !formData.email) {
      toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Preencha seus dados corretamente.' });
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Criar o pagamento no Mercado Pago primeiro (se for pago)
      let mpPayment = null;
      if (total > 0) {
        mpPayment = await createPayment({
          amount: total / 100,
          email: formData.email,
          description: `Ingressos para: ${event?.title || 'Evento'}`,
          fullName: formData.fullName,
          identificationNumber: formData.document,
        });
        setPaymentData(mpPayment);
      }

      const batch = writeBatch(db);

      // 2. Criar o pedido no Firestore
      const orderRef = doc(collection(db, 'pedidos'));
      batch.set(orderRef, {
        eventId,
        userId: user?.uid || 'guest',
        customer: formData,
        items,
        total: total / 100,
        status: total > 0 ? 'pendente' : 'pago',
        mercadoPagoId: mpPayment?.id || null,
        createdAt: serverTimestamp()
      });

      // 3. Gerar Ingressos individuais e atualizar contadores
      for (const item of items) {
        for (let i = 0; i < item.qty; i++) {
          const ticketRef = doc(collection(db, 'ingressos'));
          batch.set(ticketRef, {
            orderId: orderRef.id,
            eventId,
            userName: formData.fullName,
            userEmail: formData.email,
            ticketName: item.name,
            status: 'ativo',
            checkedInAt: null,
            createdAt: serverTimestamp()
          });
        }

        const typeRef = doc(db, 'eventos', eventId as string, 'ticketTypes', item.id);
        batch.update(typeRef, {
          soldCount: increment(item.qty)
        });
      }

      await batch.commit();

      setOrderComplete(orderRef.id);
      localStorage.removeItem('checkout_items');
      localStorage.removeItem('checkout_total');
      toast({ title: 'Pedido criado!', description: total > 0 ? 'Siga as instruções para pagamento via PIX.' : 'Sua inscrição foi confirmada!' });
    } catch (e: any) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Erro', description: e.message || 'Não foi possível processar seu pedido.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyPixCode = () => {
    if (paymentData?.qr_code) {
      navigator.clipboard.writeText(paymentData.qr_code);
      toast({ title: 'Copiado!', description: 'Código PIX copiado para a área de transferência.' });
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  if (orderComplete) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-muted/20 p-4">
        <Card className="max-w-md w-full text-center p-8 space-y-6 shadow-2xl border-none">
           <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
           </div>
           <div className="space-y-2">
              <h1 className="text-3xl font-black font-headline">Pedido Realizado!</h1>
              <p className="text-muted-foreground">Número do pedido: <span className="font-mono text-primary font-bold">{orderComplete}</span></p>
           </div>
           
           {paymentData ? (
             <div className="bg-muted/50 p-6 rounded-2xl border-2 border-dashed border-primary/20 space-y-6">
                <div className="space-y-2">
                  <p className="text-sm font-black uppercase tracking-widest text-primary">Pagamento via PIX</p>
                  <p className="text-xs text-muted-foreground">Escaneie o código abaixo ou copie a chave.</p>
                </div>
                
                {paymentData.qr_code_base64 && (
                  <div className="bg-white p-4 rounded-xl shadow-inner mx-auto w-fit">
                    <img 
                      src={`data:image/png;base64,${paymentData.qr_code_base64}`} 
                      alt="QR Code Pix" 
                      className="w-48 h-48"
                    />
                  </div>
                )}
                
                <div className="space-y-3">
                  <div className="bg-white p-3 rounded-lg text-[10px] break-all font-mono border text-muted-foreground line-clamp-2">
                    {paymentData.qr_code}
                  </div>
                  <Button onClick={copyPixCode} variant="secondary" className="w-full font-bold">
                    <Copy className="mr-2 h-4 w-4" /> COPIAR CÓDIGO PIX
                  </Button>
                </div>
                
                <div className="pt-4 border-t border-primary/10">
                   <Button asChild variant="outline" className="w-full">
                     <a href={`/ingressos/${orderComplete}`}>VER MEUS INGRESSOS</a>
                   </Button>
                </div>
             </div>
           ) : (
             <div className="space-y-4">
                <p className="text-muted-foreground">Sua inscrição foi confirmada com sucesso.</p>
                <Button asChild className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12">
                  <a href={`/ingressos/${orderComplete}`}>ACESSAR MEUS INGRESSOS</a>
                </Button>
             </div>
           )}
           
           <Button variant="ghost" className="w-full font-bold" onClick={() => router.push('/')}>Voltar para o Início</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/10">
      <Navbar />
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="flex items-center gap-4 mb-8">
           <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-5 w-5" /></Button>
           <h1 className="text-3xl font-black font-headline tracking-tight">Finalizar Compra</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="font-headline text-xl">Dados do Participante</CardTitle>
                <CardDescription>Informe os dados para a emissão do ingresso e certificado.</CardDescription>
              </CardHeader>
              <CardContent>
                <form id="checkout-form" onSubmit={handleFinish} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="font-bold">Nome Completo</Label>
                    <Input name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Como deve aparecer no certificado" required className="h-12" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-bold">CPF</Label>
                      <Input name="document" value={formData.document} onChange={handleChange} placeholder="000.000.000-00" required className="h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold">E-mail</Label>
                      <Input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="seu@email.com" required className="h-12" />
                    </div>
                  </div>
                  <div className="space-y-2 pt-4 border-t">
                    <Label className="font-bold">Endereço</Label>
                    <Input name="address" value={formData.address} onChange={handleChange} placeholder="Rua, Número, Bairro" required className="h-12" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-bold">Cidade</Label>
                      <Input name="city" value={formData.city} onChange={handleChange} required className="h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold">CEP</Label>
                      <Input name="zip" value={formData.zip} onChange={handleChange} placeholder="00000-000" required className="h-12" />
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Alert className="bg-primary/10 border-primary/20 text-primary">
              <ShieldCheck className="h-4 w-4" />
              <AlertTitle className="font-bold">Pagamento Seguro via Mercado Pago</AlertTitle>
              <AlertDescription className="text-sm">Seus dados estão protegidos. O QR Code do PIX será gerado instantaneamente após você clicar no botão concluir.</AlertDescription>
            </Alert>
          </div>

          <div className="space-y-6">
            <Card className="border-none shadow-xl sticky top-24 overflow-hidden">
              <CardHeader className="bg-primary text-white">
                <CardTitle className="font-headline">Resumo do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="p-6 space-y-4">
                   {items.map((item, idx) => (
                     <div key={idx} className="flex justify-between text-sm">
                        <span className="font-medium">{item.qty}x {item.name}</span>
                        <span className="font-bold">R$ {((item.priceCents * item.qty) / 100).toFixed(2)}</span>
                     </div>
                   ))}
                   <div className="pt-6 border-t flex justify-between font-black text-2xl text-primary">
                      <span>Total</span>
                      <span>R$ {(total / 100).toFixed(2).replace('.', ',')}</span>
                   </div>
                </div>
              </CardContent>
              <CardFooter className="p-6 pt-0">
                 <Button form="checkout-form" type="submit" disabled={isSubmitting} className="w-full bg-secondary hover:bg-secondary/90 text-white font-black h-16 text-xl rounded-2xl shadow-lg shadow-secondary/20">
                   {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : 'CONCLUIR PEDIDO'}
                 </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
