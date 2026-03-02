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
import { Loader2, ArrowLeft, Info, AlertTriangle, CreditCard, ShieldCheck, Mail, InfoIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    document: '',
    email: '',
    confirmEmail: '',
    address: 'Venda Online',
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
      try {
        const docSnap = await getDoc(doc(db, 'eventos', eventId as string));
        if (docSnap.exists()) setEvent({ id: docSnap.id, ...docSnap.data() });
      } catch (e) {
        console.error("Erro ao carregar evento:", e);
      } finally {
        setLoading(false);
      }
    }
    loadEvent();
  }, [eventId, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Se for documento, permite apenas números
    const finalValue = name === 'document' ? value.replace(/\D/g, '') : value;
    setFormData(prev => ({ ...prev, [name]: finalValue }));
    if (errorMessage) setErrorMessage(null);
  };

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validações básicas
    const nameParts = formData.fullName.trim().split(/\s+/);
    if (nameParts.length < 2) {
      setErrorMessage('O Mercado Pago exige Nome e Sobrenome para processar o pagamento.');
      return;
    }

    if (formData.document.length < 11) {
      setErrorMessage('O CPF/CNPJ deve conter apenas números (mínimo 11 dígitos).');
      return;
    }

    if (formData.email.trim().toLowerCase() !== formData.confirmEmail.trim().toLowerCase()) {
      setErrorMessage('Os e-mails informados não são idênticos. Verifique a digitação.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (total > 0) {
        // Fluxo de pagamento via Mercado Pago
        const res = await fetch('/api/mercadopago/create-preference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: `temp-${Date.now()}`,
            title: event?.title || 'Ingresso Evento',
            quantity: 1,
            unitPrice: total / 100,
            buyerEmail: formData.email.trim(),
            buyerName: formData.fullName.trim()
          })
        });

        const preference = await res.json();
        if (preference.error) throw new Error(preference.error);

        // Criar pedido no Firestore como pendente antes de redirecionar
        const batch = writeBatch(db);
        const orderRef = doc(collection(db, 'pedidos'));
        const { confirmEmail, ...customerData } = formData;

        batch.set(orderRef, {
          eventId,
          userId: user?.uid || 'guest',
          customer: customerData,
          items,
          total: total / 100,
          status: 'pendente',
          createdAt: serverTimestamp(),
          paymentPreferenceId: preference.id
        });

        await batch.commit();

        // Limpar carrinho e redirecionar para o Mercado Pago
        localStorage.removeItem('checkout_items');
        localStorage.removeItem('checkout_total');
        
        // Redireciona para o checkout oficial do Mercado Pago (com PIX, Cartão, etc)
        window.location.href = preference.init_point;
      } else {
        // Caso Grátis
        const batch = writeBatch(db);
        const orderRef = doc(collection(db, 'pedidos'));
        const { confirmEmail, ...customerData } = formData;
        batch.set(orderRef, {
          eventId,
          userId: user?.uid || 'guest',
          customer: customerData,
          items,
          total: 0,
          status: 'pago',
          createdAt: serverTimestamp(),
          type: 'free'
        });
        await batch.commit();
        router.push(`/pagamento/sucesso?orderId=${orderRef.id}`);
      }
      
    } catch (e: any) {
      console.error('Erro no checkout:', e);
      setErrorMessage(e.message || 'Erro ao processar checkout.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-muted/10">
      <Navbar />
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="flex items-center gap-4 mb-8">
           <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-5 w-5" /></Button>
           <h1 className="text-3xl font-black font-headline tracking-tight">Finalizar Compra</h1>
        </div>

        {errorMessage && (
          <Alert variant="destructive" className="mb-8 bg-destructive/10 text-destructive border-destructive/20">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle className="font-bold">Atenção</AlertTitle>
            <AlertDescription className="text-sm font-medium">{errorMessage}</AlertDescription>
          </Alert>
        )}

        <Alert className="mb-8 border-amber-500 bg-amber-50">
          <InfoIcon className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 font-bold">Importante para Testes</AlertTitle>
          <AlertDescription className="text-amber-700 text-xs">
            Se estiver em ambiente de teste e vir o erro "Saldo Insuficiente", abra esta página em uma **JANELA ANÔNIMA** e use um **e-mail diferente** da sua conta de vendedor.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="font-headline text-xl">Seus Dados</CardTitle>
                <CardDescription>Preencha os dados do participante para gerar os ingressos.</CardDescription>
              </CardHeader>
              <CardContent>
                <form id="checkout-form" onSubmit={handleFinish} className="space-y-6">
                  <div className="space-y-2">
                    <Label className="font-bold">Nome Completo</Label>
                    <Input name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Nome e Sobrenome (Obrigatório)" required className="h-12" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="font-bold">CPF/CNPJ (digite apenas números)</Label>
                    <Input 
                      name="document" 
                      value={formData.document} 
                      onChange={handleChange} 
                      placeholder="Ex: 00000000000" 
                      required 
                      className="h-12"
                      inputMode="numeric"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="font-bold flex items-center gap-2"><Mail className="h-4 w-4" /> E-mail</Label>
                      <Input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="seu@email.com" required className="h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold flex items-center gap-2"><Mail className="h-4 w-4" /> Confirmar E-mail</Label>
                      <Input name="confirmEmail" type="email" value={formData.confirmEmail} onChange={handleChange} placeholder="Repita seu e-mail" required className="h-12" />
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Alert className="bg-blue-50 border-blue-200">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-xs text-blue-700">
                Você será redirecionado para o ambiente seguro do Mercado Pago para escolher sua forma de pagamento (PIX, Cartão ou Boleto).
              </AlertDescription>
            </Alert>
          </div>

          <div className="space-y-6">
            <Card className="border-none shadow-xl sticky top-24 overflow-hidden">
              <CardHeader className="bg-primary text-white">
                <CardTitle className="font-headline">Resumo</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
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
              </CardContent>
              <CardFooter className="p-6 pt-0">
                 <Button form="checkout-form" type="submit" disabled={isSubmitting} className="w-full bg-secondary hover:bg-secondary/90 text-white font-black h-16 text-xl rounded-2xl shadow-lg shadow-secondary/20 transition-all active:scale-95 group">
                   {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <CreditCard className="mr-2 h-6 w-6 group-hover:scale-110 transition-transform" />}
                   CONFIRMAR E PAGAR
                 </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
