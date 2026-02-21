'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
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
  FormDescription,
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
  ChevronRight, 
  ChevronLeft, 
  Trash2, 
  Image as ImageIcon,
  MapPin,
  FileText
} from 'lucide-react';
import Image from 'next/image';

const eventSchema = z.object({
  title: z.string().min(6, 'Título deve ter pelo menos 6 caracteres.').max(80, 'Título muito longo.'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'O slug deve conter apenas letras minúsculas, números e hífens.'),
  category: z.string().min(1, 'Selecione uma categoria.'),
  tags: z.string().optional(),
  startAt: z.string().min(1, 'Data de início é obrigatória.'),
  endAt: z.string().min(1, 'Data de término é obrigatória.'),
  city: z.string().min(1, 'Cidade é obrigatória.'),
  state: z.string().min(1, 'Estado é obrigatório.'),
  address: z.string().min(1, 'Endereço é obrigatório.'),
  mapUrl: z.string().url('URL inválida.').optional().or(z.literal('')),
  capacity: z.coerce.number().int().positive('Capacidade deve ser maior que 0.'),
  description: z.string().min(50, 'A descrição deve ter pelo menos 50 caracteres.'),
  whatsapp: z.string().optional(),
  email: z.string().email('Email inválido.').optional().or(z.literal('')),
  instagram: z.string().optional(),
  attendanceMode: z.enum(['STRICT', 'EOD', 'SIMPLE']),
  certEnabled: z.boolean(),
  certTitle: z.string().optional(),
  certBody: z.string().optional(),
  certHours: z.string().optional(),
  certSignatureName: z.string().optional(),
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
      tags: '',
      startAt: '',
      endAt: '',
      city: '',
      state: '',
      address: '',
      mapUrl: '',
      capacity: 100,
      description: '',
      whatsapp: '',
      email: '',
      instagram: '',
      attendanceMode: 'EOD',
      certEnabled: false,
      certTitle: 'Certificado de Participação',
      certBody: 'Certificamos que {NAME} participou do evento {EVENT_TITLE} realizado em {CITY} no dia {DATE}.',
      certHours: '',
      certSignatureName: '',
    },
  });

  const watchedTitle = form.watch('title');
  useEffect(() => {
    if (watchedTitle && step === 1 && !createdEventId) {
      form.setValue('slug', generateSlug(watchedTitle));
    }
  }, [watchedTitle, form, step, createdEventId]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({ variant: 'destructive', title: 'Arquivo muito grande', description: 'O tamanho máximo permitido é 2MB.' });
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
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
        tags: data.tags?.split(',').map(t => t.trim()).filter(Boolean) || [],
        startAt: data.startAt ? Timestamp.fromDate(new Date(data.startAt)) : null,
        endAt: data.endAt ? Timestamp.fromDate(new Date(data.endAt)) : null,
        city: data.city,
        state: data.state,
        address: data.address,
        mapUrl: data.mapUrl || '',
        capacity: data.capacity,
        description: data.description,
        contact: {
          whatsapp: data.whatsapp || '',
          email: data.email || '',
          instagram: data.instagram || '',
        },
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
          try { await deleteObject(ref(storage, oldCoverPath)); } catch (e) {}
        }
        const ext = imageFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const coverPath = `events/${eventId}/cover/cover-${Date.now()}.${ext}`;
        const imageRef = ref(storage, coverPath);
        await uploadBytes(imageRef, imageFile);
        const coverUrl = await getDownloadURL(imageRef);
        await updateDoc(doc(db, EVENTS_COLLECTION, eventId), { coverUrl, coverPath });
        setOldCoverPath(coverPath);
      }

      await setDoc(doc(db, EVENTS_COLLECTION, eventId, 'certificateConfig', 'main'), {
        enabled: data.certEnabled,
        attendanceMode: data.attendanceMode,
        title: data.certTitle || 'Certificado de Participação',
        bodyTemplate: data.certBody || '',
        workloadHours: data.certHours || '',
        signatureName: data.certSignatureName || '',
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
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b pb-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Admin {'>'} Eventos {'>'} Novo</div>
            <h1 className="text-3xl font-black font-headline tracking-tight">Criar Novo Evento</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => handleSave(true)} disabled={isSavingDraft || isLoading}>
              {isSavingDraft && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Rascunho
            </Button>
            <Button className="bg-primary hover:bg-primary/90 text-white font-bold" onClick={() => handleSave(false)} disabled={isLoading || isSavingDraft || step < 4}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              CRIAR EVENTO
            </Button>
          </div>
        </div>
        
        <div className="flex justify-between mt-8 relative">
           <div className="absolute top-1/2 left-0 w-full h-0.5 bg-muted -translate-y-1/2 z-0" />
           {[1, 2, 3, 4].map((s) => (
             <div key={s} className={cn("relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all border-4", step === s ? "bg-primary border-primary text-white scale-110" : step > s ? "bg-secondary border-secondary text-white" : "bg-background border-muted text-muted-foreground")}>
               {step > s ? <CheckCircle2 className="h-6 w-6" /> : s}
               <span className="absolute -bottom-7 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                  {s === 1 ? 'Básico' : s === 2 ? 'Local' : s === 3 ? 'Mídia' : 'Revisão'}
               </span>
             </div>
           ))}
        </div>
      </div>

      <Form {...form}>
        <div className="space-y-8">
          {step === 1 && (
            <Card className="border-none shadow-xl">
              <CardHeader className="bg-muted/30"><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Informações Básicas</CardTitle></CardHeader>
              <CardContent className="pt-6 space-y-6">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Título do Evento</FormLabel><FormControl><Input placeholder="Ex: Workshop Master" {...field} className="h-12" /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="slug" render={({ field }) => (
                    <FormItem><FormLabel>Link (Slug)</FormLabel><FormControl><div className="flex items-center gap-1 bg-muted/50 rounded-md px-3 border"><span className="text-muted-foreground text-sm">eventomassa.com.br/</span><input {...field} className="bg-transparent h-10 outline-none text-sm w-full" /></div></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem><FormLabel>Categoria</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="Workshop">Workshop</SelectItem><SelectItem value="Curso">Curso</SelectItem><SelectItem value="Networking">Networking</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                  )} />
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card className="border-none shadow-xl">
              <CardHeader className="bg-muted/30"><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> Logística</CardTitle></CardHeader>
              <CardContent className="pt-6 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <FormField control={form.control} name="startAt" render={({ field }) => (
                    <FormItem><FormLabel>Início</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="endAt" render={({ field }) => (
                    <FormItem><FormLabel>Término</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField control={form.control} name="city" render={({ field }) => (
                    <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                   <FormField control={form.control} name="state" render={({ field }) => (
                    <FormItem><FormLabel>Estado</FormLabel><FormControl><Input maxLength={2} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="capacity" render={({ field }) => (
                    <FormItem><FormLabel>Capacidade</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem><FormLabel>Endereço Completo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <div className="space-y-8">
              <Card className="border-none shadow-xl overflow-hidden">
                <CardHeader className="bg-muted/30"><CardTitle className="flex items-center gap-2"><ImageIcon className="h-5 w-5 text-primary" /> Mídia e Descrição</CardTitle></CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="space-y-2">
                    <FormLabel>Capa do Evento</FormLabel>
                    <div className={cn("relative h-64 w-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all bg-muted/20", imagePreview ? "border-primary/50" : "border-muted-foreground/20")}>
                      {imagePreview ? (
                        <div className="relative w-full h-full group">
                          <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                             <Button variant="destructive" onClick={() => { setImageFile(null); setImagePreview(null); }}>Remover</Button>
                          </div>
                        </div>
                      ) : (
                        <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                          <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                          <span className="text-sm font-bold text-muted-foreground">Clique para selecionar imagem</span>
                          <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                        </label>
                      )}
                    </div>
                  </div>
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem><FormLabel>Descrição</FormLabel><FormControl><Textarea placeholder="Conte sobre o evento..." className="min-h-[200px]" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </CardContent>
              </Card>
            </div>
          )}

          {step === 4 && (
            <Card className="border-none shadow-xl">
               <CardContent className="py-12 flex flex-col items-center text-center space-y-6">
                  <div className="bg-primary/10 p-6 rounded-full"><CheckCircle2 className="h-12 w-12 text-primary" /></div>
                  <div className="space-y-2">
                     <h2 className="text-2xl font-bold">Tudo pronto!</h2>
                     <p className="text-muted-foreground max-w-md mx-auto">Ao criar o evento, você será levado ao painel de gerenciamento para configurar os ingressos e publicá-lo.</p>
                  </div>
               </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between pt-6">
            <Button type="button" variant="ghost" onClick={() => setStep(s => s - 1)} disabled={step === 1 || isLoading}>Voltar</Button>
            {step < 4 ? (
              <Button type="button" onClick={nextStep} className="bg-secondary hover:bg-secondary/90 text-white font-bold px-8">Continuar</Button>
            ) : (
              <Button type="button" onClick={() => handleSave(false)} disabled={isLoading} className="bg-primary hover:bg-primary/90 text-white font-bold px-12 h-12">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                CRIAR EVENTO AGORA
              </Button>
            )}
          </div>
        </div>
      </Form>
    </div>
  );
}