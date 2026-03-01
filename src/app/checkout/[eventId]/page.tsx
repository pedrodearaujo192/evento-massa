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
import { Loader2, ArrowLeft, Info, AlertTriangle, CreditCard, ShieldCheck, Mail } from 'lucide-react';
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
    
    // Se for o campo documento, removemos qualquer caractere que não seja número
    const finalValue = name === 'document' ? value.replace(/\D/g, '') : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: finalValue
    }));
    
    if (errorMessage) setErrorMessage(null);
  };

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validação de Nome Completo
    const nameParts = formData.fullName.trim().split(/\s+/);
    if (nameParts.length < 2) {
      setErrorMessage('O Mercado Pago exige Nome e Sobrenome (Ex: João Silva).');
      return;
    }

    // Validação de CPF/CNPJ
    if (formData.document.length < 11) {
      setErrorMessage('O CPF/CNPJ deve conter apenas números e ter no mínimo 11 dígitos.');
      return;
    }

    // Validação de Confirmação de E-mail
    if (formData.email.trim().toLowerCase() !== formData.confirmEmail.trim().toLowerCase()) {
      setErrorMessage('Os e-mails informados não são idênticos. Verifique a digitação.');
      return;
    }

    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      const orderRef = doc(collection(db, 'pedidos'));
      
      // Removemos confirmEmail antes de salvar no banco
      const { confirmEmail, ...customerData } = formData;

      const orderData = {
        eventId,
        userId: user?.uid || 'guest',
        customer: customerData,
        items,
        total: total / 100,
        status: total > 0 ? 'pendente' : 'pago',
        createdAt: serverTimestamp(),
        paymentMethod: 'mercadopago_preference'
      };

      batch.set(orderRef, orderData);

      for (const item of items) {
        const typeRef = doc(db, 'eventos', eventId as string, 'ticketTypes', item.id);
        batch.update(typeRef, { soldCount: increment(item.qty) });
        
        for (let i = 0; i < item.qty; i++) {
          const ticketRef = doc(collection(db, 'ingressos'));
          batch.set(ticketRef, {
            orderId: orderRef.id,
            eventId,
            userName: formData.fullName,
            userEmail: formData.email,
            ticketName: item.name,
            status: total > 0 ? 'pendente' : 'ativo',
            checkedInAt: null,
            createdAt: serverTimestamp()
          });
        }
      }

      await batch.commit();

      if (total > 0) {
        const response = await fetch('/api/mercadopago/create-preference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: orderRef.id,
            title: `Ingressos: ${event?.title || 'Evento'}`,
            quantity: 1,
            unitPrice: total / 100,
            buyerEmail: formData.email.trim(),
            buyerName: formData.fullName.trim()
          })
        });

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        const paymentUrl = data.sandbox_init_point || data.init_point;
        localStorage.removeItem('checkout_items');
        localStorage.removeItem('checkout_total');
        window.location.href = paymentUrl;
      } else {
        localStorage.removeItem('checkout_items');
        localStorage.removeItem('checkout_total');
        router.push(`/pagamento/sucesso?orderId=${orderRef.id}`);
      }
      
    } catch (e: any) {
      console.error('Erro no checkout:', e);
      setErrorMessage(e.message || 'Erro ao processar pagamento. Tente novamente.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
            <AlertDescription className="text-sm font-medium">
              {errorMessage}
            </AlertDescription>
          </Alert>
        )}

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
                      pattern="[0-9]*"
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
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-xs text-blue-700">
                Você será redirecionado para o Mercado Pago com total segurança.
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
