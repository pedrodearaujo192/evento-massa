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
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
  PlusCircle,
  Tag,
  Youtube,
  Scissors,
  Palette,
  Moon,
  Sun
} from 'lucide-react';
import Image from 'next/image';

const eventSchema = z.object({
  title: z.string().min(6, 'Título deve ter pelo menos 6 caracteres.').max(80, 'Título muito longo.'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'O slug deve conter apenas letras minúsculas, números e hífens.'),
  category: z.string().min(1, 'Selecione uma categoria.'),
  sector: z.string().min(1, 'Selecione um setor da beleza.'),
  tags: z.string().optional(),
  startAt: z.string().min(1, 'Data de início é obrigatória.'),
  endAt: z.string().min(1, 'Data de término é obrigatória.'),
  city: z.string().min(1, 'Cidade é obrigatória.'),
  state: z.string().min(1, 'Estado é obrigatório.'),
  address: z.string().min(1, 'Endereço é obrigatório.'),
  mapUrl: z.string().url('Insira um link válido do Google Maps').or(z.literal('')).optional(),
  capacity: z.coerce.number().int().positive('Capacidade deve ser maior que 0.'),
  description: z.string().min(50, 'A descrição deve ter pelo menos 50 caracteres.'),
  youtubeUrl: z.string().url('Insira um link válido do YouTube').or(z.literal('')).optional(),
  certEnabled: z.boolean().default(false),
  attendanceMode: z.enum(['STRICT', 'EOD', 'SIMPLE']).default('EOD'),
  primaryColor: z.string().default('#FF007F'),
  secondaryColor: z.string().default('#22C55E'),
  themeMode: z.enum(['light', 'dark']).default('dark'),
});

type EventFormValues = z.infer<typeof eventSchema>;

const SECTORS = [
  "Barbearia",
  "Cabelo / Cabeleireiros",
  "Estética Facial / Corporal",
  "Maquiagem",
  "Manicure / Pedicure",
  "Sobrancelhas / Cílios",
  "Micropigmentação",
  "Bem-estar / SPA",
  "Outros"
];

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
      sector: '',
      tags: '',
      startAt: '',
      endAt: '',
      city: '',
      state: '',
      address: '',
      mapUrl: '',
      capacity: 100,
      description: '',
      youtubeUrl: '',
      certEnabled: false,
      attendanceMode: 'EOD',
      primaryColor: '#FF007F',
      secondaryColor: '#22C55E',
      themeMode: 'dark',
    },
  });

  const watchedTitle = form.watch('title');
  useEffect(() => {
    if (watchedTitle && step === 1 && !createdEventId) {
      form.setValue('slug', generateSlug(watchedTitle));
    }
  }, [watchedTitle, form, step, createdEventId]);

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
      if (file.size > 5 * 1024 * 1024) {
        toast({ variant: 'destructive', title: 'Arquivo muito grande', description: 'O tamanho máximo permitido é 5MB.' });
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
    if (!user) {
      toast({ variant: 'destructive', title: 'Não autenticado', description: 'Você precisa estar logado.' });
      return;
    }
    
    if (isDraft) setIsSavingDraft(true);
    else setIsLoading(true);

    try {
      const data = form.getValues();
      
      if (!isDraft) {
        const ok = await form.trigger();
        if (!ok) {
          toast({ variant: 'destructive', title: 'Campos inválidos', description: 'Por favor, revise o formulário.' });
          setIsLoading(false);
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

      const tagsArray = data.tags ? data.tags.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag !== '') : [];

      const eventData = {
        ownerId: user.uid,
        title: data.title,
        slug: finalSlug,
        category: data.category,
        sector: data.sector,
        tags: tagsArray,
        startAt: data.startAt ? Timestamp.fromDate(new Date(data.startAt)) : null,
        endAt: data.endAt ? Timestamp.fromDate(new Date(data.endAt)) : null,
        city: data.city,
        state: data.state,
        address: data.address,
        mapUrl: data.mapUrl || '',
        youtubeUrl: data.youtubeUrl || '',
        capacity: data.capacity,
        description: data.description,
        status: 'draft',
        primaryColor: data.primaryColor,
        secondaryColor: data.secondaryColor,
        themeMode: data.themeMode,
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
        try {
          if (oldCoverPath) {
            try { await deleteObject(ref(storage, oldCoverPath)); } catch (e) {}
          }
        
          const safeName = imageFile.name.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
          const coverPath = `eventos/${eventId}/capa/cover-${Date.now()}-${safeName}`;
          const imageRef = ref(storage, coverPath);
        
          const snap = await uploadBytes(imageRef, imageFile, {
            contentType: imageFile.type
          });
          const coverUrl = await getDownloadURL(snap.ref);
        
          await updateDoc(doc(db, EVENTS_COLLECTION, eventId), { 
            coverUrl, 
            coverPath,
            updatedAt: serverTimestamp()
          });
          setOldCoverPath(coverPath);
        } catch (uploadError: any) {
          console.error('ERRO NO UPLOAD:', uploadError);
          toast({ 
            variant: 'destructive', 
            title: 'Erro no Upload da Imagem', 
            description: 'A imagem não foi salva. O evento foi salvo sem a imagem.' 
          });
        }
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
      console.error('ERRO GERAL NO SALVAMENTO:', error);
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message || 'Erro desconhecido.' });
    } finally {
      setIsLoading(false);
      setIsSavingDraft(false);
    }
  };

  const nextStep = async () => {
    const fieldsByStep: Record<number, any[]> = {
      1: ['title', 'slug', 'category', 'sector'],
      2: ['startAt', 'endAt', 'city', 'state', 'address', 'capacity', 'mapUrl'],
      3: ['description', 'youtubeUrl', 'primaryColor', 'secondaryColor', 'themeMode'],
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
                  {s === 1 ? 'Básico' : s === 2 ? 'Local' : s === 3 ? 'Visual' : 'Revisão'}
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
                    <FormItem><FormLabel className="font-bold">Tipo de Evento</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="h-12"><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="Workshop">Workshop</SelectItem><SelectItem value="Curso">Curso</SelectItem><SelectItem value="Masterclass">Masterclass</SelectItem><SelectItem value="Congresso">Congresso</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <FormField control={form.control} name="sector" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold flex items-center gap-2"><Scissors className="h-4 w-4 text-primary" /> Setor da Beleza</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger className="h-12"><SelectValue placeholder="Selecione o setor..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          {SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="tags" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold flex items-center gap-2"><Tag className="h-4 w-4 text-primary" /> Tags (SEO)</FormLabel>
                      <FormControl><Input placeholder="Ex: barbearia, degradê, tesoura" {...field} className="h-12" /></FormControl>
                      <FormDescription>Separe por vírgulas para ajudar na busca.</FormDescription>
                      <FormMessage />
                    </FormItem>
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
                <FormField control={form.control} name="mapUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Link do Google Maps</FormLabel>
                    <FormControl><Input placeholder="https://maps.google.com/..." {...field} className="h-12" /></FormControl>
                    <FormDescription>Link para que o participante saiba como chegar.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <div className="space-y-8">
              <Card className="border-none shadow-2xl overflow-hidden">
                <CardHeader className="bg-muted/30 border-b"><CardTitle className="flex items-center gap-2 font-headline"><Palette className="h-5 w-5 text-primary" /> Visual e Mídia</CardTitle></CardHeader>
                <CardContent className="pt-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-6">
                        <FormLabel className="font-bold">Identidade do Evento</FormLabel>
                        <div className="grid grid-cols-2 gap-4">
                           <FormField control={form.control} name="primaryColor" render={({ field }) => (
                              <FormItem>
                                 <FormLabel className="text-xs">Cor Principal</FormLabel>
                                 <div className="flex gap-2">
                                    <Input type="color" {...field} className="w-12 h-10 p-1" />
                                    <Input {...field} className="h-10" />
                                 </div>
                              </FormItem>
                           )} />
                           <FormField control={form.control} name="secondaryColor" render={({ field }) => (
                              <FormItem>
                                 <FormLabel className="text-xs">Cor Secundária</FormLabel>
                                 <div className="flex gap-2">
                                    <Input type="color" {...field} className="w-12 h-10 p-1" />
                                    <Input {...field} className="h-10" />
                                 </div>
                              </FormItem>
                           )} />
                        </div>

                        <FormField control={form.control} name="themeMode" render={({ field }) => (
                          <FormItem className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                            <div>
                               <FormLabel className="font-bold">Modo Escuro (Dark Mode)</FormLabel>
                               <FormDescription>Se ativado, o fundo da página será escuro.</FormDescription>
                            </div>
                            <FormControl>
                               <Switch 
                                  checked={field.value === 'dark'} 
                                  onCheckedChange={(val) => field.onChange(val ? 'dark' : 'light')} 
                               />
                            </FormControl>
                          </FormItem>
                        )} />

                        <div className="p-4 border rounded-xl bg-muted/10">
                           <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Prévia do Estilo</p>
                           <div className={cn("p-6 rounded-lg transition-all", form.watch('themeMode') === 'dark' ? 'bg-black text-white' : 'bg-white text-black border')}>
                              <div className="flex gap-2 mb-4">
                                 <div className="h-3 w-12 rounded-full" style={{ backgroundColor: form.watch('primaryColor') }} />
                                 <div className="h-3 w-8 rounded-full" style={{ backgroundColor: form.watch('secondaryColor') }} />
                              </div>
                              <p className="text-sm font-bold">Título do Evento</p>
                              <Button className="mt-4 w-full h-8 text-[10px]" style={{ backgroundColor: form.watch('primaryColor') }}>BOTÃO DE COMPRA</Button>
                           </div>
                        </div>
                     </div>

                     <div className="space-y-4">
                        <FormLabel className="font-bold">Capa do Evento (16:9)</FormLabel>
                        <div className={cn("relative h-64 w-full rounded-2xl border-4 border-dashed flex flex-col items-center justify-center transition-all bg-muted/10 group overflow-hidden", imagePreview ? "border-primary/30" : "border-muted/50 hover:border-primary/40")}>
                          {imagePreview ? (
                            <div className="relative w-full h-full">
                              <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                 <Button variant="destructive" size="sm" onClick={() => { setImageFile(null); }}>Trocar Imagem</Button>
                              </div>
                            </div>
                          ) : (
                            <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                              <Upload className="h-8 w-8 text-primary mb-2" />
                              <span className="text-xs font-black">Selecionar Capa</span>
                              <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                            </label>
                          )}
                        </div>
                        <FormField control={form.control} name="youtubeUrl" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold text-xs flex items-center gap-2"><Youtube className="h-4 w-4 text-red-600" /> Link do YouTube</FormLabel>
                            <FormControl><Input placeholder="https://www.youtube.com/watch?v=..." {...field} className="h-10" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                     </div>
                  </div>

                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem><FormLabel className="font-bold">Descrição Completa</FormLabel><FormControl><Textarea placeholder="Descreva os detalhes..." className="min-h-[200px] rounded-xl" {...field} /></FormControl><FormMessage /></FormItem>
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
