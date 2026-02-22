'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  setDoc, 
  doc, 
  query, 
  where, 
  getDocs,
  Timestamp,
  updateDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { generateSlug, cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  Upload, 
  CheckCircle2, 
  Image as ImageIcon,
  MapPin,
  FileText,
  ArrowRight,
  PlusCircle
} from 'lucide-react';
import Image from 'next/image';

const eventSchema = z.object({
  title: z.string().min(6, 'Título deve ter pelo menos 6 caracteres.').max(80, 'Título muito longo.'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'O slug deve conter apenas letras minúsculas, números e hífens.'),
  category: z.string().min(1, 'Selecione uma categoria.'),
  startAt: z.string().min(1, 'Data de início é obrigatória.'),
  endAt: z.string().min(1, 'Data de término é obrigatória.'),
  city: z.string().min(1, 'Cidade é obrigatória.'),
  state: z.string().min(1, 'Estado é obrigatório.'),
  address: z.string().min(1, 'Endereço é obrigatório.'),
  capacity: z.coerce.number().int().positive('Capacidade deve ser maior que 0.'),
  description: z.string().min(50, 'A descrição deve ter pelo menos 50 caracteres.'),
  certEnabled: z.boolean().default(false),
  attendanceMode: z.enum(['STRICT', 'EOD', 'SIMPLE']).default('EOD'),
});

type EventFormValues = z.infer<typeof eventSchema>;

const EVENTS_COLLECTION = 'eventos';

export default function NewEventPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);
  const [oldCoverPath, setOldCoverPath] = useState<string | null>(null);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: '',
      slug: '',
      category: '',
      startAt: '',
      endAt: '',
      city: '',
      state: '',
      address: '',
      capacity: 100,
      description: '',
      certEnabled: false,
      attendanceMode: 'EOD',
    },
  });

  const watchedTitle = form.watch('title');
  useEffect(() => {
    if (watchedTitle && step === 1 && !createdEventId) {
      form.setValue('slug', generateSlug(watchedTitle));
    }
  }, [watchedTitle, form, step, createdEventId]);

  // Limpeza de Blob URL para evitar memory leak
  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({ variant: 'destructive', title: 'Arquivo muito grande', description: 'O tamanho máximo permitido é 2MB.' });
        return;
      }
      setImageFile(file);
    }
  };

  const checkSlugUniqueness = async (slug: string) => {
    const q = query(collection(db, EVENTS_COLLECTION), where('slug', '==', slug));
    const snapshot = await getDocs(q);
    return snapshot.empty;
  };

  const handleSave = async (isDraft: boolean) => {
    if (!user) return;
    
    if (isDraft) setIsSavingDraft(true);
    else setIsLoading(true);

    try {
      const data = form.getValues();
      
      if (!isDraft) {
        const ok = await form.trigger();
        if (!ok) {
          toast({ variant: 'destructive', title: 'Campos inválidos', description: 'Por favor, revise o formulário.' });
          return;
        }
        if (!imageFile && !oldCoverPath) {
          toast({ variant: 'destructive', title: 'Imagem obrigatória', description: 'Adicione uma capa para o evento.' });
          return;
        }
      }

      let finalSlug = data.slug;
      if (!createdEventId) {
        let counter = 1;
        while (!(await checkSlugUniqueness(finalSlug))) {
          finalSlug = `${data.slug}-${counter++}`;
        }
      }

      const eventData = {
        ownerId: user.uid,
        title: data.title,
        slug: finalSlug,
        category: data.category,
        startAt: data.startAt ? Timestamp.fromDate(new Date(data.startAt)) : null,
        endAt: data.endAt ? Timestamp.fromDate(new Date(data.endAt)) : null,
        city: data.city,
        state: data.state,
        address: data.address,
        capacity: data.capacity,
        description: data.description,
        status: 'draft',
        updatedAt: serverTimestamp(),
      };

      let eventId = createdEventId;
      if (!eventId) {
        const docRef = await addDoc(collection(db, EVENTS_COLLECTION), {
          ...eventData,
          createdAt: serverTimestamp(),
        });
        eventId = docRef.id;
        setCreatedEventId(eventId);
      } else {
        await updateDoc(doc(db, EVENTS_COLLECTION, eventId), eventData as any);
      }

      if (imageFile) {
        if (oldCoverPath) {
          try { await deleteObject(ref(storage, oldCoverPath)); } catch {}
        }
      
        const safeName = imageFile.name.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
        const coverPath = `eventos/${eventId}/capa/cover-${Date.now()}-${safeName}`;
        const imageRef = ref(storage, coverPath);
      
        const snap = await uploadBytes(imageRef, imageFile);
        const coverUrl = await getDownloadURL(snap.ref);
      
        await updateDoc(doc(db, EVENTS_COLLECTION, eventId), { 
          coverUrl, 
          coverPath 
        });
        setOldCoverPath(coverPath);
      }

      await setDoc(doc(db, EVENTS_COLLECTION, eventId, 'certificateConfig', 'main'), {
        enabled: data.certEnabled,
        attendanceMode: data.attendanceMode,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      toast({
        title: isDraft ? 'Rascunho salvo!' : 'Evento criado!',
        description: isDraft ? 'Continue quando quiser.' : 'Agora configure os ingressos.',
      });

      if (!isDraft) {
        router.push(`/admin/eventos/${eventId}`);
      }
    } catch (error: any) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message });
    } finally {
      setIsLoading(false);
      setIsSavingDraft(false);
    }
  };

  const nextStep = async () => {
    const fieldsByStep: Record<number, any[]> = {
      1: ['title', 'slug', 'category'],
      2: ['startAt', 'endAt', 'city', 'state', 'address', 'capacity'],
      3: ['description'],
    };
    const isValid = await form.trigger(fieldsByStep[step] as any);
    if (isValid) setStep(s => s + 1);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="bg-background/95 backdrop-blur border-b pb-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4">
          <div>
            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-widest font-bold">Admin {'>'} Novo Evento</div>
            <h1 className="text-4xl font-black font-headline tracking-tight text-foreground">Criar Experiência</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => handleSave(true)} disabled={isSavingDraft || isLoading}>
              {isSavingDraft && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Rascunho
            </Button>
          </div>
        </div>
        
        <div className="flex justify-between mt-10 relative px-4">
           <div className="absolute top-1/2 left-0 w-full h-0.5 bg-muted -translate-y-1/2 z-0" />
           {[1, 2, 3, 4].map((s) => (
             <div key={s} className={cn("relative z-10 w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all border-4 shadow-sm", step === s ? "bg-primary border-primary text-white scale-110" : step > s ? "bg-secondary border-secondary text-white" : "bg-background border-muted text-muted-foreground")}>
               {step > s ? <CheckCircle2 className="h-6 w-6" /> : s}
               <span className="absolute -bottom-8 text-[10px] font-black uppercase tracking-widest whitespace-nowrap text-foreground/70">
                  {s === 1 ? 'Básico' : s === 2 ? 'Local' : s === 3 ? 'Mídia' : 'Revisão'}
               </span>
             </div>
           ))}
        </div>
      </div>

      <Form {...form}>
        <div className="space-y-8 mt-10">
          {step === 1 && (
            <Card className="border-none shadow-2xl overflow-hidden">
              <CardHeader className="bg-muted/30 border-b"><CardTitle className="flex items-center gap-2 font-headline"><FileText className="h-5 w-5 text-primary" /> O que vamos realizar?</CardTitle></CardHeader>
              <CardContent className="pt-8 space-y-6">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel className="font-bold">Título do Evento</FormLabel><FormControl><Input placeholder="Ex: Masterclass Mechas de Ouro" {...field} className="h-14 text-lg" /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <FormField control={form.control} name="slug" render={({ field }) => (
                    <FormItem><FormLabel className="font-bold">Link Amigável (Slug)</FormLabel><FormControl><div className="flex items-center gap-1 bg-muted/50 rounded-lg px-4 border focus-within:ring-2 ring-primary/20"><span className="text-muted-foreground text-sm font-medium">/</span><input {...field} className="bg-transparent h-12 outline-none text-sm w-full font-medium" /></div></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem><FormLabel className="font-bold">Categoria</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="h-12"><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="Workshop">Workshop</SelectItem><SelectItem value="Curso">Curso</SelectItem><SelectItem value="Masterclass">Masterclass</SelectItem><SelectItem value="Congresso">Congresso</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                  )} />
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card className="border-none shadow-2xl overflow-hidden">
              <CardHeader className="bg-muted/30 border-b"><CardTitle className="flex items-center gap-2 font-headline"><MapPin className="h-5 w-5 text-primary" /> Quando e Onde?</CardTitle></CardHeader>
              <CardContent className="pt-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <FormField control={form.control} name="startAt" render={({ field }) => (
                    <FormItem><FormLabel className="font-bold">Início</FormLabel><FormControl><Input type="datetime-local" {...field} className="h-12" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="endAt" render={({ field }) => (
                    <FormItem><FormLabel className="font-bold">Término</FormLabel><FormControl><Input type="datetime-local" {...field} className="h-12" /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <FormField control={form.control} name="city" render={({ field }) => (
                    <FormItem><FormLabel className="font-bold">Cidade</FormLabel><FormControl><Input {...field} className="h-12" /></FormControl><FormMessage /></FormItem>
                  )} />
                   <FormField control={form.control} name="state" render={({ field }) => (
                    <FormItem><FormLabel className="font-bold">Estado</FormLabel><FormControl><Input maxLength={2} {...field} placeholder="Ex: SP" className="h-12" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="capacity" render={({ field }) => (
                    <FormItem><FormLabel className="font-bold">Capacidade Máxima</FormLabel><FormControl><Input type="number" {...field} className="h-12" /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem><FormLabel className="font-bold">Endereço do Local</FormLabel><FormControl><Input placeholder="Ex: Av. Paulista, 1000 - Bela Vista" {...field} className="h-12" /></FormControl><FormMessage /></FormItem>
                )} />
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <div className="space-y-8">
              <Card className="border-none shadow-2xl overflow-hidden">
                <CardHeader className="bg-muted/30 border-b"><CardTitle className="flex items-center gap-2 font-headline"><ImageIcon className="h-5 w-5 text-primary" /> Visual e Detalhes</CardTitle></CardHeader>
                <CardContent className="pt-8 space-y-8">
                  <div className="space-y-4">
                    <FormLabel className="font-bold">Capa do Evento (16:9 recomendado)</FormLabel>
                    <div className={cn("relative h-80 w-full rounded-2xl border-4 border-dashed flex flex-col items-center justify-center transition-all bg-muted/10 group overflow-hidden", imagePreview ? "border-primary/30" : "border-muted/50 hover:border-primary/40")}>
                      {imagePreview ? (
                        <div className="relative w-full h-full">
                          <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                             <Button variant="destructive" size="lg" className="font-bold" onClick={() => { setImageFile(null); }}>Trocar Imagem</Button>
                          </div>
                        </div>
                      ) : (
                        <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-10">
                          <div className="bg-primary/10 p-5 rounded-full mb-4 group-hover:scale-110 transition-transform"><Upload className="h-8 w-8 text-primary" /></div>
                          <span className="text-lg font-black text-foreground">Clique para selecionar imagem</span>
                          <span className="text-sm text-muted-foreground mt-2">JPG, PNG ou WEBP até 2MB</span>
                          <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                        </label>
                      )}
                    </div>
                  </div>
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem><FormLabel className="font-bold">Conteúdo e Programação</FormLabel><FormControl><Textarea placeholder="Descreva o que os participantes aprenderão, cronograma, etc..." className="min-h-[250px] text-lg leading-relaxed rounded-xl" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </CardContent>
              </Card>
            </div>
          )}

          {step === 4 && (
            <Card className="border-none shadow-2xl overflow-hidden">
               <CardContent className="py-20 flex flex-col items-center text-center space-y-8">
                  <div className="bg-secondary/20 p-8 rounded-full shadow-inner"><CheckCircle2 className="h-16 w-16 text-secondary" /></div>
                  <div className="space-y-4">
                     <h2 className="text-4xl font-black font-headline">Tudo pronto!</h2>
                     <p className="text-muted-foreground max-w-lg mx-auto text-lg">Seu evento será criado como <strong>rascunho</strong>. Você será levado ao painel para criar os ingressos e publicá-lo para venda.</p>
                  </div>
               </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between pt-10 border-t">
            <Button type="button" variant="ghost" size="lg" className="font-bold" onClick={() => setStep(s => s - 1)} disabled={step === 1 || isLoading}>Anterior</Button>
            {step < 4 ? (
              <Button type="button" onClick={nextStep} className="bg-secondary hover:bg-secondary/90 text-white font-black px-10 h-14 text-lg rounded-xl shadow-lg shadow-secondary/20">Continuar <ArrowRight className="ml-2 h-5 w-5" /></Button>
            ) : (
              <Button type="button" onClick={() => handleSave(false)} disabled={isLoading} className="bg-primary hover:bg-primary/90 text-white font-black px-14 h-16 text-xl rounded-2xl shadow-xl shadow-primary/30 group">
                {isLoading ? <Loader2 className="mr-3 h-6 w-6 animate-spin" /> : <PlusCircle className="mr-3 h-6 w-6 group-hover:scale-110 transition-transform" />}
                CRIAR MEU EVENTO
              </Button>
            )}
          </div>
        </div>
      </Form>
    </div>
  );
}
