'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
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
import { Loader2, ArrowLeft, Upload } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const eventSchema = z.object({
  titulo: z.string().min(5, { message: 'O título deve ter pelo menos 5 caracteres.' }),
  categoria: z.enum(['Workshop', 'Congresso', 'Masterclass', 'Lançamento'], {
    required_error: 'Selecione uma categoria.',
  }),
  data: z.string().min(1, { message: 'A data do evento é obrigatória.' }),
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImageFile(null);
      setImagePreview(null);
    }
  };

  const onSubmit = async (data: EventFormValues) => {
    if (!user?.uid) {
      toast({
        variant: "destructive",
        title: "Sessão inválida",
        description: "Faça login novamente para continuar.",
      });
      console.error("Tentativa de envio sem user.uid. User:", user);
      return;
    }
  
    if (!imageFile) {
      toast({
        variant: "destructive",
        title: "Imagem obrigatória",
        description: "Por favor, selecione uma imagem para o evento.",
      });
      return;
    }
  
    setIsLoading(true);
  
    try {
      console.log("USER COMPLETO:", user);
      console.log("UID:", user?.uid);
  
      const eventData = {
        titulo: data.titulo,
        descricao: data.descricao,
        categoria: data.categoria,
        data: data.data,
        local: data.local,
        preco: Number(data.preco),
        imagem_url: "", // Temporarily empty
        id_criador: user.uid,
        criadoEm: serverTimestamp(),
        status: "ativo",
      };
  
      console.log("Criando documento do evento no Firestore (sem imagem):", eventData);
      const eventRef = await addDoc(collection(db, "eventos"), eventData);
      console.log("Documento do evento criado com ID:", eventRef.id);
  
      console.log("Arquivo da imagem:", imageFile);
      console.log("Tipo:", imageFile.type);
      console.log("Tamanho:", imageFile.size);
  
      console.log("Iniciando upload da imagem...");
      const imagePath = `eventos/${user.uid}/${eventRef.id}/capa.jpg`;
      const imageStorageRef = ref(storage, imagePath);
  
      await uploadBytes(imageStorageRef, imageFile);
      const imageUrl = await getDownloadURL(imageStorageRef);
      console.log("Upload da imagem concluído. URL:", imageUrl);
  
      console.log("Atualizando documento do evento com a URL da imagem...");
      await updateDoc(eventRef, { imagem_url: imageUrl });
      console.log("Documento do evento atualizado com sucesso.");
  
      toast({
        title: "Evento criado com sucesso!",
        description: data.titulo,
      });
  
      router.push("/dashboard");
  
    } catch (error: any) {
      console.error("ERRO COMPLETO AO CRIAR EVENTO:", error);
  
      toast({
        variant: "destructive",
        title: "Erro ao salvar evento",
        description:
          error.message ||
          "Ocorreu uma falha desconhecida. Verifique as regras do Firebase e o console do navegador para mais detalhes.",
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
          <p className="text-muted-foreground">
            Preencha os detalhes para seu próximo evento de sucesso.
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>Informações Principais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="titulo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título do Evento</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Workshop Mechas Perfeitas" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="descricao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Descreva os detalhes do seu evento..."
                            {...field}
                            rows={5}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Detalhes</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="categoria"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoria</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma categoria" />
                            </SelectTrigger>
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
                    )}
                  />
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
                            min={new Date().toISOString().split('T')[0]}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="local"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Local</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Maceió - AL" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="preco"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preço (R$)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Ex: 297.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Imagem do Evento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="image-upload"
                      className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted"
                    >
                      {imagePreview ? (
                        <Image
                          src={imagePreview}
                          alt="Pré-visualização da imagem"
                          width={200}
                          height={192}
                          className="object-cover h-full w-full rounded-md"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                          <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                          <p className="mb-2 text-sm text-muted-foreground">
                            <span className="font-semibold">Clique para enviar</span> ou arraste
                          </p>
                          <p className="text-xs text-muted-foreground">PNG, JPG ou WEBP (MAX. 5MB)</p>
                        </div>
                      )}
                    </label>
                    <Input
                      id="image-upload"
                      type="file"
                      className="hidden"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handleImageChange}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          <div className="flex justify-end gap-4">
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
