'use client';

import { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UploadCloud, CheckCircle, Info, ShieldAlert } from 'lucide-react';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function UploadPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [attemptLogs, setAttemptLogs] = useState<string[]>([]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadedUrl(null);
    setAttemptLogs([]);
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

  const handleUpload = async () => {
    setAttemptLogs([]);
    setUploadedUrl(null);
    setIsLoading(true);

    const logs: string[] = [];
    const log = (message: string) => {
      console.log(message);
      logs.push(message);
      setAttemptLogs([...logs]);
    };
    
    log('--- INICIANDO TESTE DE UPLOAD ---');
    
    if (!user || !user.uid) {
      log('❌ ERRO: Usuário não autenticado ou UID indisponível.');
      toast({ variant: 'destructive', title: 'Falha na Autenticação', description: 'Usuário não encontrado. Faça login novamente.' });
      setIsLoading(false);
      return;
    }
    
    if (!imageFile) {
      log('❌ ERRO: Nenhuma imagem selecionada.');
      toast({ variant: 'destructive', title: 'Nenhuma imagem selecionada', description: 'Por favor, selecione um arquivo para enviar.' });
      setIsLoading(false);
      return;
    }
    
    // Caminho simplificado para o teste
    const imagePath = `eventos/${user.uid}/test-${Date.now()}-${imageFile.name}`;
    const imageStorageRef = ref(storage, imagePath);

    try {
      log(`✅ Autenticação OK. UID: ${user.uid}`);
      log(`Arquivo: ${imageFile.name} (${(imageFile.size / 1024).toFixed(2)} KB)`);
      log(`Destino: ${imagePath}`);
      log('Enviando para o Firebase Storage...');

      // O uploadBytes retorna uma promessa. O await garante que esperamos a conclusão.
      const snapshot = await uploadBytes(imageStorageRef, imageFile);
      log('✅ uploadBytes concluído!');
      
      const imageUrl = await getDownloadURL(snapshot.ref);
      log(`✅ URL obtida: ${imageUrl.substring(0, 60)}...`);
      
      setUploadedUrl(imageUrl);
      toast({
        title: 'Upload realizado com sucesso!',
        description: 'A imagem está no Firebase Storage.',
      });

    } catch (error: any) {
      log('--- ❌ ERRO NO UPLOAD ---');
      log(`Código: ${error.code || 'N/A'}`);
      log(`Mensagem: ${error.message || 'Desconhecido'}`);
      
      toast({
        variant: 'destructive',
        title: 'Falha no Upload',
        description: `Erro: ${error.code || error.message}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-headline text-3xl md:text-4xl">Teste de Upload Isolado</h1>
        <p className="text-muted-foreground">
          Página dedicada para testar o envio de uma imagem para o Firebase Storage.
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Logs em Tempo Real</AlertTitle>
        <AlertDescription>
          Se o upload travar, os logs abaixo mostrarão exatamente em qual etapa o processo parou.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Selecione e envie</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="image-upload-test"
              className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted"
            >
              {imagePreview ? (
                <Image
                  src={imagePreview}
                  alt="Pré-visualização"
                  width={300}
                  height={256}
                  className="object-contain h-full w-full rounded-md"
                />
              ) : (
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                  <UploadCloud className="w-10 h-10 mb-4 text-muted-foreground" />
                  <p className="mb-2 text-sm text-muted-foreground">
                    Clique para selecionar uma imagem
                  </p>
                </div>
              )}
            </label>
            <Input
              id="image-upload-test"
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleImageChange}
              disabled={isLoading}
            />
          </div>
          <Button
            onClick={handleUpload}
            disabled={isLoading || !imageFile}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="mr-2 h-4 w-4" />
            )}
            {isLoading ? 'Enviando...' : 'Iniciar Teste de Upload'}
          </Button>
        </CardContent>
      </Card>
      
      {attemptLogs.length > 0 && (
        <Card>
           <CardHeader>
              <CardTitle>Logs da Operação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="bg-black text-green-400 p-4 rounded-md font-mono text-xs space-y-2 overflow-x-auto max-h-80 border-2 border-primary/20">
                  {attemptLogs.map((log, index) => (
                    <p key={index} className={log.includes('❌') ? 'text-red-500' : (log.includes('✅') ? 'text-green-400' : 'text-gray-300')}>
                      {log}
                    </p>
                  ))}
                </div>
                {uploadedUrl && (
                  <div className="space-y-2 pt-4">
                    <Alert className="border-green-500 bg-green-500/10">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertTitle className="text-green-700">Upload OK!</AlertTitle>
                      <AlertDescription className="text-green-600">
                        A imagem foi salva e a URL gerada com sucesso.
                      </AlertDescription>
                    </Alert>
                    <Image src={uploadedUrl} alt="Imagem enviada" width={400} height={300} className="mt-4 rounded-md border" />
                  </div>
                )}
            </CardContent>
        </Card>
      )}

    </div>
  );
}
