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
import { Loader2, UploadCloud, CheckCircle, AlertTriangle } from 'lucide-react';
import Image from 'next/image';

export default function UploadPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadedUrl(null); // Reset on new image selection
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
    if (!user || !user.uid) {
      toast({
        variant: 'destructive',
        title: 'Usuário não autenticado',
        description: 'Faça login novamente para poder enviar.',
      });
      console.error("Upload attempt failed: user or user.uid is not available.", { user });
      return;
    }

    if (!imageFile) {
      toast({
        variant: 'destructive',
        title: 'Nenhuma imagem selecionada',
        description: 'Por favor, selecione uma imagem para enviar.',
      });
      return;
    }

    setIsLoading(true);
    setUploadedUrl(null);
    
    // Path consistent with security rules: eventos/{userId}/{fileName}
    const imagePath = `eventos/${user.uid}/test-${Date.now()}-${imageFile.name}`;
    const imageStorageRef = ref(storage, imagePath);

    try {
      console.log('--- INICIANDO TESTE DE UPLOAD ---');
      console.log('Usuário UID:', user.uid);
      console.log('Caminho de destino no Storage:', imagePath);
      console.log('Arquivo:', imageFile.name, `(${imageFile.size} bytes)`);

      await uploadBytes(imageStorageRef, imageFile);
      const imageUrl = await getDownloadURL(imageStorageRef);

      console.log('--- UPLOAD BEM-SUCEDIDO ---');
      console.log('URL da imagem:', imageUrl);
      
      setUploadedUrl(imageUrl);
      toast({
        title: 'Upload realizado com sucesso!',
        description: 'A imagem está no Firebase Storage.',
      });

    } catch (error: any) {
      console.error('--- ERRO NO UPLOAD ---', error);
      console.error('Código do Erro:', error.code);
      console.error('Mensagem do Erro:', error.message);

      toast({
        variant: 'destructive',
        title: 'Falha no Upload',
        description: `Verifique as regras do Firebase Storage e o console (F12). Erro: ${error.code || error.message}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-headline text-3xl md:text-4xl">Teste de Upload para o Storage</h1>
        <p className="text-muted-foreground">
          Página dedicada para testar o envio de uma imagem para o Firebase Storage.
        </p>
      </div>

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
            Passo 2: Enviar Imagem
          </Button>
        </CardContent>
      </Card>

      {uploadedUrl && (
        <Card className="border-green-500">
           <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-500" />
                <CardTitle className="text-green-600">Upload Concluído</CardTitle>
              </div>
              <CardDescription>
                A imagem foi enviada com sucesso. Este é o link dela no Storage:
              </CardDescription>
            </CardHeader>
            <CardContent>
                <Input readOnly value={uploadedUrl} className="text-xs" />
                <Image src={uploadedUrl} alt="Imagem enviada" width={400} height={300} className="mt-4 rounded-md border" />
            </CardContent>
        </Card>
      )}

    </div>
  );
}
