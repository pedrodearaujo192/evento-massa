'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const newAdminSchema = z.object({
  nome: z.string().min(3, { message: 'O nome deve ter pelo menos 3 caracteres.' }),
  email: z.string().email({ message: 'Por favor, insira um email válido.' }),
  empresa: z.string().optional(),
});

type NewAdminFormValues = z.infer<typeof newAdminSchema>;

export default function NewAdminPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<NewAdminFormValues>({
    resolver: zodResolver(newAdminSchema),
    defaultValues: {
      nome: '',
      email: '',
      empresa: '',
    },
  });

  const onSubmit = async (data: NewAdminFormValues) => {
    setIsLoading(true);

    // This flow is simplified. In a real-world scenario, you would use a secure
    // backend (like a Firebase Cloud Function) to create the user in Firebase Auth
    // and then create the Firestore document.
    // For this implementation, we will only create the Firestore document,
    // assuming the user will be created in the Auth console manually.

    try {
      // Check if email already exists
      const q = query(collection(db, 'usuarios'), where('email', '==', data.email));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        toast({
          variant: 'destructive',
          title: 'Email já existe',
          description: 'Este email já está cadastrado no sistema.',
        });
        setIsLoading(false);
        return;
      }

      // The UID would be set by a Cloud Function after Auth user creation.
      // We are adding the document without a specific ID for now, Firestore will auto-gen one.
      // This document will need to be updated with the correct UID later.
      await addDoc(collection(db, 'usuarios'), {
        nome: data.nome,
        email: data.email,
        empresa: data.empresa || '',
        tipo: 'adm_evento',
        ativo: true,
        criadoEm: serverTimestamp(),
      });
      
      toast({
        title: 'Administrador Convidado!',
        description: `${data.nome} foi adicionado. O usuário precisa ser criado no painel do Firebase Authentication.`,
      });
      router.push('/super-admin/admins');
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erro ao criar admin',
        description: 'Ocorreu um problema. Por favor, tente novamente.',
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex items-center gap-4">
        <Link href="/super-admin/admins" passHref>
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="font-headline text-3xl md:text-4xl">Novo Administrador</h1>
          <p className="text-muted-foreground">Convide um novo administrador para gerenciar eventos.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalhes do Administrador</CardTitle>
          <CardDescription>
            Após o cadastro, o usuário precisará ser criado no painel do Firebase Authentication
            para que possa fazer login.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Maria Silva" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="maria@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="empresa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Empresa (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Beleza & Cia" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Criar Administrador
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
