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
    log(`Verificando autenticação...`);
    log(`Objeto 'user' do useAuth: ${user ? JSON.stringify({email: user.email, uid: user.uid}) : 'null'}`);


    if (!user || !user.uid) {
      log('❌ ERRO: Usuário não autenticado ou UID indisponível. O upload não pode prosseguir se depender do UID.');
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
    
    // Para este teste, usaremos um caminho que as regras de segurança permitem.
    const imagePath = `eventos/${user.uid}/test-${Date.now()}-${imageFile.name}`;
    const imageStorageRef = ref(storage, imagePath);

    try {
      log(`✅ Autenticação OK. UID: ${user.uid}`);
      log(`Arquivo selecionado: ${imageFile.name} (${(imageFile.size / 1024).toFixed(2)} KB)`);
      log(`Caminho de destino no Storage: ${imagePath}`);
      log('Enviando para o Firebase Storage...');

      await uploadBytes(imageStorageRef, imageFile);
      log('✅ Upload concluído com sucesso!');
      
      const imageUrl = await getDownloadURL(imageStorageRef);
      log(`✅ URL da imagem obtida: ${imageUrl.substring(0, 80)}...`);
      
      setUploadedUrl(imageUrl);
      toast({
        title: 'Upload realizado com sucesso!',
        description: 'A imagem está no Firebase Storage.',
      });

    } catch (error: any) {
      log('--- ❌ ERRO NO UPLOAD ---');
      log(`Código do Erro: ${error.code || 'N/A'}`);
      log(`Mensagem do Erro: ${error.message || 'Desconhecido'}`);
      log('Verifique as Regras de Segurança do Storage e a configuração do Firebase.');
      
      toast({
        variant: 'destructive',
        title: 'Falha no Upload',
        description: `Ocorreu um erro. Verifique os logs nesta página. Erro: ${error.code || error.message}`,
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
        <AlertTitle>Como usar esta página</AlertTitle>
        <AlertDescription>
          Esta página realiza um teste de upload para a pasta `eventos/` no seu Storage. Se o upload ficar "carregando" e não terminar, a causa mais provável é um bloqueio pelas <strong>Regras de Segurança do Storage</strong>. Verifique se suas regras permitem a escrita no caminho que aparecerá nos logs abaixo.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Passo 1: Selecione a Imagem</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="image-upload"
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
                    <span className="font-semibold">Clique para enviar</span> ou arraste e solte
                  </p>
                  <p className="text-xs text-muted-foreground">PNG, JPG, WEBP</p>
                </div>
              )}
            </label>
            <Input
              id="image-upload"
              type="file"
              className="hidden"
              accept="image/png, image/jpeg, image/webp"
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
            Passo 2: Enviar Imagem para Teste
          </Button>
        </CardContent>
      </Card>
      
      {attemptLogs.length > 0 && (
        <Card>
           <CardHeader>
              <CardTitle>Resultados do Teste</CardTitle>
              <CardDescription>
                Logs da tentativa de upload para depuração.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-md font-mono text-xs space-y-2 overflow-x-auto max-h-80">
                  {attemptLogs.map((log, index) => <p key={index} className={log.includes('❌') ? 'text-red-500' : (log.includes('✅') ? 'text-green-500' : '')}>{log}</p>)}
                </div>
                {uploadedUrl && (
                  <div className="space-y-2 pt-4">
                    <Alert variant="default" className="border-green-500 bg-green-500/10">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertTitle className="text-green-700">Sucesso!</AlertTitle>
                      <AlertDescription className="text-green-600">
                        A imagem foi enviada. Você pode copiar o link abaixo ou visualizá-la.
                      </AlertDescription>
                    </Alert>
                    <Input readOnly value={uploadedUrl} className="text-xs" />
                    <Image src={uploadedUrl} alt="Imagem enviada" width={400} height={300} className="mt-4 rounded-md border" />
                  </div>
                )}
            </CardContent>
        </Card>
      )}

    </div>
  );
}
