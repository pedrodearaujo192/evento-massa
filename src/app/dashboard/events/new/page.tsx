'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, CalendarIcon, Upload } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Image from 'next/image';

const eventSchema = z.object({
  titulo: z.string().min(5, { message: 'O título deve ter pelo menos 5 caracteres.' }),
  categoria: z.enum(['Workshop', 'Congresso', 'Masterclass', 'Lançamento'], {
    required_error: 'Selecione uma categoria.',
  }),
  data: z.date({ required_error: 'A data do evento é obrigatória.' }),
  local: z.string().min(3, { message: 'O local é obrigatório.' }),
  preco: z.coerce.number().min(0, { message: 'O preço não pode ser negativo.' }),
  descricao: z.string().min(10, { message: 'A descrição deve ter pelo menos 10 caracteres.' }),
  imagem: z.instanceof(File).optional(),
});

type EventFormValues = z.infer<typeof eventSchema>;

export default function NewEventPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      titulo: '',
      descricao: '',
      local: '',
      preco: 0,
      categoria: undefined,
      data: undefined,
      imagem: undefined,
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      form.setValue('imagem', file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: EventFormValues) => {
    if (!user) {
        toast({ variant: "destructive", title: "Não autenticado", description: "Você precisa estar logado para criar um evento." });
        return;
    }
    setIsLoading(true);
    
    try {
        let imageUrl = 'https://picsum.photos/seed/default-event/1200/800'; // Default image
        if (data.imagem) {
            const imageRef = ref(storage, `eventos/${user.uid}_${Date.now()}_${data.imagem.name}`);
            const snapshot = await uploadBytes(imageRef, data.imagem);
            imageUrl = await getDownloadURL(snapshot.ref);
        }

        await addDoc(collection(db, 'eventos'), {
            ...data,
            data: format(data.data, 'yyyy-MM-dd'),
            imagem_url: imageUrl,
            id_criador: user.uid,
            criadoEm: serverTimestamp(),
            status: 'ativo',
        });
      
      toast({
        title: 'Evento Criado com Sucesso!',
        description: `"${data.titulo}" foi adicionado à sua lista de eventos.`,
      });
      router.push('/dashboard');

    } catch (error) {
      console.error("Error creating event: ", error);
      toast({
        variant: 'destructive',
        title: 'Erro ao criar evento',
        description: 'Ocorreu um problema. Por favor, tente novamente.',
      });
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
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
                    <Card>
                        <CardHeader><CardTitle>Imagem do Evento</CardTitle></CardHeader>
                        <CardContent>
                            <FormField control={form.control} name="imagem" render={({ field }) => (
                                <FormItem>
                                <FormControl>
                                    <div className="w-full border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary transition-colors">
                                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="image-upload" />
                                    <label htmlFor="image-upload" className="w-full cursor-pointer">
                                        {imagePreview ? (
                                        <div className="relative w-full h-64 rounded-md overflow-hidden">
                                            <Image src={imagePreview} alt="Preview da imagem" layout="fill" objectFit="cover" />
                                        </div>
                                        ) : (
                                        <div className="space-y-2">
                                            <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
                                            <p className="font-semibold">Clique para carregar uma imagem</p>
                                            <p className="text-xs text-muted-foreground">PNG, JPG, GIF até 10MB</p>
                                        </div>
                                        )}
                                    </label>
                                    </div>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}/>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Detalhes</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <FormField control={form.control} name="categoria" render={({ field }) => (
                                <FormItem>
                                <FormLabel>Categoria</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
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
                            <FormField control={form.control} name="data" render={({ field }) => (
                                <FormItem className="flex flex-col">
                                <FormLabel>Data do Evento</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                        {field.value ? format(field.value, 'PPP', { locale: ptBR }) : <span>Escolha uma data</span>}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))} initialFocus />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                                </FormItem>
                            )}/>
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
