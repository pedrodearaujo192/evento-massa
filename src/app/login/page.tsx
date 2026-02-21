'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Loader2, ShieldAlert } from 'lucide-react';
import { Icons } from '@/components/icons';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/hooks/use-auth';

const loginSchema = z.object({
  email: z.string().email({ message: 'Por favor, insira um email válido.' }),
  password: z.string().min(6, { message: 'A senha deve ter no mínimo 6 caracteres.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/');
    }
  }, [user, authLoading, router]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      toast({
        title: 'Login bem-sucedido!',
        description: 'Redirecionando para o seu painel...',
      });
    } catch (error: any) {
      console.error("Erro no login:", error.code, error.message);
      let message = 'Email ou senha incorretos. Por favor, tente novamente.';
      
      if (error.code === 'auth/invalid-credential') {
        message = 'Credenciais inválidas. Verifique se o e-mail e a senha estão corretos ou se o usuário foi criado no Console do Firebase.';
      } else if (error.code === 'auth/user-not-found') {
        message = 'Usuário não encontrado.';
      } else if (error.code === 'auth/wrong-password') {
        message = 'Senha incorreta.';
      }

      toast({
        variant: 'destructive',
        title: 'Erro no login',
        description: message,
      });
      setIsLoading(false);
    }
  };

  if (authLoading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Icons.Logo />
        </div>
        <Card className="shadow-2xl">
          <CardHeader>
            <CardTitle className="font-headline text-3xl">Acesso ao Painel</CardTitle>
            <CardDescription>Use suas credenciais para entrar no sistema.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="seu@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Entrar
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              Esqueceu sua senha? Entre em contato com o suporte.
            </p>
          </CardFooter>
        </Card>

        <Alert className="border-primary/50 text-primary-foreground bg-primary/10">
            <ShieldAlert className="h-4 w-4 !text-primary" />
            <AlertTitle className="font-bold text-primary">Acesso Super Admin</AlertTitle>
            <AlertDescription className="text-primary/90">
                Para o primeiro acesso, use o email: <strong className="font-semibold">pedrodearaujo.192@gmail.com</strong>. <br/>
                Certifique-se de que este usuário foi criado na aba <strong>Authentication</strong> do seu Console Firebase.
            </AlertDescription>
        </Alert>

      </div>
    </div>
  );
}
