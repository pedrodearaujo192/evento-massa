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
import { Loader2, UploadCloud } from 'lucide-react';
import Image from 'next/image';

export default function UploadTestPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

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

  const handleUpload = async () => {
    if (!user?.uid) {
      toast({
        variant: 'destructive',
        title: 'Sessão inválida',
        description: 'Faça login novamente para testar o upload.',
      });
      return;
    }

    if (!imageFile) {
      toast({
        variant: 'destructive',
        title: 'Nenhuma imagem selecionada',
        description: 'Por favor, selecione uma imagem para o teste.',
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log('Iniciando UPLOAD DE TESTE...');
      const imagePath = `testes/${user.uid}/${Date.now()}_${imageFile.name}`;
      const imageStorageRef = ref(storage, imagePath);

      console.log("Arquivo:", imageFile);
      console.log("Tipo:", imageFile.type);
      console.log("Tamanho:", imageFile.size);

      await uploadBytes(imageStorageRef, imageFile);
      const imageUrl = await getDownloadURL(imageStorageRef);

      console.log('Upload de teste concluído. URL:', imageUrl);
      toast({
        title: 'Upload de teste bem-sucedido!',
        description: `A imagem foi enviada para o Storage. URL: ${imageUrl}`,
      });
    } catch (error: any) {
      console.error('ERRO NO UPLOAD DE TESTE:', error);
      toast({
        variant: 'destructive',
        title: 'Erro no upload de teste',
        description:
          error.message ||
          'Ocorreu uma falha desconhecida. Verifique as regras do Firebase e o console do navegador para mais detalhes.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-headline text-3xl md:text-4xl">Teste de Upload</h1>
        <p className="text-muted-foreground">
          Use esta página para enviar uma imagem diretamente para o Firebase Storage e verificar as permissões.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enviar Imagem</CardTitle>
          <CardDescription>
            Selecione um arquivo de imagem e clique em "Enviar para Teste" para fazer o upload.
          </CardDescription>
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
                  alt="Pré-visualização da imagem"
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
                  <p className="text-xs text-muted-foreground">PNG, JPG, WEBP (MAX. 5MB)</p>
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
            Enviar para Teste
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
