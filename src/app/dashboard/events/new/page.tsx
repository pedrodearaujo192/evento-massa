'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const eventSchema = z.object({
  titulo: z.string().min(5, { message: 'O título deve ter pelo menos 5 caracteres.' }),
  categoria: z.enum(['Workshop', 'Congresso', 'Masterclass', 'Lançamento'], {
    required_error: 'Selecione uma categoria.',
  }),
  data: z.string({ required_error: 'A data do evento é obrigatória.' }).min(1, { message: 'A data do evento é obrigatória.' }),
  local: z.string().min(3, { message: 'O local é obrigatório.' }),
  preco: z.coerce.number().min(0, { message: 'O preço não pode ser negativo.' }),
  descricao: z.string().min(10, { message: 'A descrição deve ter pelo menos 10 caracteres.' }),
});

type EventFormValues = z.infer<typeof eventSchema>;

export default function NewEventPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      titulo: '',
      descricao: '',
      local: '',
      preco: 0,
      categoria: undefined,
      data: '',
    },
  });

  const onSubmit = async (data: EventFormValues) => {
    if (!user?.uid) {
      toast({
        variant: "destructive",
        title: "Sessão inválida",
        description: "Faça login novamente.",
      });
      return;
    }
  
    setIsLoading(true);
  
    try {
      const eventData = {
        titulo: data.titulo,
        descricao: data.descricao,
        categoria: data.categoria,
        data: data.data,
        local: data.local,
        preco: Number(data.preco),
        imagem_url: "https://images.unsplash.com/photo-1516849841032-87cbac4d88f7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwyfHxwcm9kdWN0JTIwbGF1bmNofGVufDB8fHx8MTc2OTI1NzY5Mnww&ixlib=rb-4.1.0&q=80&w=1080",
        id_criador: user.uid,
        criadoEm: serverTimestamp(),
        status: "ativo",
      };
  
      console.log("Salvando Firestore:", eventData);
  
      await addDoc(collection(db, "eventos"), eventData);
  
      toast({
        title: "Evento criado com sucesso!",
        description: data.titulo,
      });
  
      router.push("/dashboard");
  
    } catch (error: any) {
      console.error("ERRO COMPLETO:", error);
  
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message || "Falha desconhecida",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex items-center gap-4">
        <Link href="/dashboard" passHref>
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="font-headline text-3xl md:text-4xl">Criar Novo Evento</h1>
          <p className="text-muted-foreground">Preencha os detalhes para seu próximo evento de sucesso.</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Informações Principais</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <FormField control={form.control} name="titulo" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Título do Evento</FormLabel>
                                    <FormControl><Input placeholder="Ex: Workshop Mechas Perfeitas" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="descricao" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descrição</FormLabel>
                                    <FormControl><Textarea placeholder="Descreva os detalhes do seu evento..." {...field} rows={5} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Detalhes</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <FormField control={form.control} name="categoria" render={({ field }) => (
                                <FormItem>
                                <FormLabel>Categoria</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    <SelectItem value="Workshop">Workshop</SelectItem>
                                    <SelectItem value="Congresso">Congresso</SelectItem>
                                    <SelectItem value="Masterclass">Masterclass</SelectItem>
                                    <SelectItem value="Lançamento">Lançamento</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField
                              control={form.control}
                              name="data"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Data do Evento</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="date"
                                      {...field}
                                      min={new Date().toISOString().split("T")[0]}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField control={form.control} name="local" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Local</FormLabel>
                                    <FormControl><Input placeholder="Ex: Maceió - AL" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="preco" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Preço (R$)</FormLabel>
                                    <FormControl><Input type="number" placeholder="Ex: 297.00" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </CardContent>
                    </Card>
                </div>
            </div>
            <div className="flex justify-end">
                <Button type="submit" size="lg" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Evento
                </Button>
            </div>
        </form>
      </Form>
    </div>
  );
}
