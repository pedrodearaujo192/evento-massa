'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, addDoc, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ArrowLeft, ShieldCheck, CheckCircle2 } from 'lucide-react';
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
  const [orderComplete, setOrderComplete] = useState<string | null>(null);

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
      // 1. Criar o pedido
      const orderRef = await addDoc(collection(db, 'pedidos'), {
        eventId,
        userId: user?.uid || 'guest',
        customer: formData,
        items,
        total: total / 100,
        status: 'pendente',
        createdAt: serverTimestamp()
      });

      // 2. Incrementar o contador de vendidos em cada ticketType
      for (const item of items) {
        const ticketRef = doc(db, 'eventos', eventId as string, 'ticketTypes', item.id);
        await updateDoc(ticketRef, {
          soldCount: increment(item.qty)
        });
      }

      setOrderComplete(orderRef.id);
      localStorage.removeItem('checkout_items');
      localStorage.removeItem('checkout_total');
      toast({ title: 'Pedido criado!', description: 'Siga as instruções para pagamento.' });
    } catch (e: any) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível processar seu pedido.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  if (orderComplete) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-muted/20 p-4">
        <Card className="max-w-md w-full text-center p-8 space-y-6">
           <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
           </div>
           <div className="space-y-2">
              <h1 className="text-2xl font-black font-headline">Pedido Realizado!</h1>
              <p className="text-muted-foreground">Número do pedido: <span className="font-mono text-primary">{orderComplete}</span></p>
           </div>
           <div className="bg-muted/50 p-6 rounded-xl border-2 border-dashed border-primary/20">
              <p className="text-sm font-bold mb-2">Instruções de Pagamento (PIX)</p>
              <div className="bg-white p-4 rounded-lg mb-4 text-xs break-all font-mono">
                00020126580014br.gov.bcb.pix0136suachavepixaqui5204000053039865405{(total/100).toFixed(2)}5802BR5913EVENTOMASSABR6009SAOPAULO62070503***6304****
              </div>
              <p className="text-[10px] text-muted-foreground">Após o pagamento, sua presença será confirmada pelo organizador.</p>
           </div>
           <Button className="w-full" onClick={() => router.push('/')}>Voltar para o Início</Button>
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
           <h1 className="text-2xl font-black font-headline tracking-tight">Finalizar Compra</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Dados do Participante</CardTitle>
                <CardDescription>Informe os dados para a emissão do ingresso e certificado.</CardDescription>
              </CardHeader>
              <CardContent>
                <form id="checkout-form" onSubmit={handleFinish} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome Completo</Label>
                    <Input name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Como deve aparecer no certificado" required />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>CPF ou CNPJ</Label>
                      <Input name="document" value={formData.document} onChange={handleChange} placeholder="000.000.000-00" required />
                    </div>
                    <div className="space-y-2">
                      <Label>E-mail</Label>
                      <Input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="seu@email.com" required />
                    </div>
                  </div>
                  <div className="space-y-2 pt-4 border-t">
                    <Label>Endereço</Label>
                    <Input name="address" value={formData.address} onChange={handleChange} placeholder="Rua, Número, Bairro" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Cidade</Label>
                      <Input name="city" value={formData.city} onChange={handleChange} required />
                    </div>
                    <div className="space-y-2">
                      <Label>CEP</Label>
                      <Input name="zip" value={formData.zip} onChange={handleChange} placeholder="00000-000" required />
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Alert className="bg-secondary/10 border-secondary/20 text-secondary-foreground">
              <ShieldCheck className="h-4 w-4 text-secondary" />
              <AlertTitle className="font-bold">Pagamento Seguro</AlertTitle>
              <AlertDescription className="text-sm">Seus dados estão protegidos. O pagamento é processado manualmente pelo organizador após o envio do comprovante.</AlertDescription>
            </Alert>
          </div>

          <div className="space-y-6">
            <Card className="border-none shadow-lg">
              <CardHeader className="bg-muted/50">
                <CardTitle>Resumo do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="p-4 space-y-4">
                   {items.map((item, idx) => (
                     <div key={idx} className="flex justify-between text-sm">
                        <span>{item.qty}x {item.name}</span>
                        <span className="font-bold">R$ {((item.priceCents * item.qty) / 100).toFixed(2)}</span>
                     </div>
                   ))}
                   <div className="pt-4 border-t flex justify-between font-black text-xl text-primary">
                      <span>Total</span>
                      <span>R$ {(total / 100).toFixed(2).replace('.', ',')}</span>
                   </div>
                </div>
              </CardContent>
              <CardFooter className="p-4 pt-0">
                 <Button form="checkout-form" type="submit" disabled={isSubmitting} className="w-full bg-primary hover:bg-primary/90 text-white font-black h-14 text-lg rounded-xl">
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
