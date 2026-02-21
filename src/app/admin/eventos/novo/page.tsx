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
  Timestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { generateSlug } from '@/lib/utils';

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
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  Upload, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  Plus, 
  Trash2, 
  Image as ImageIcon,
  MapPin,
  Calendar as CalendarIcon,
  Settings,
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
  agenda: z.array(z.object({
    time: z.string(),
    title: z.string(),
    description: z.string().optional(),
  })),
});

type EventFormValues = z.infer<typeof eventSchema>;

export default function NewEventPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

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
      agenda: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'agenda',
  });

  // Auto-slug generation
  const watchedTitle = form.watch('title');
  useEffect(() => {
    if (watchedTitle && step === 1) {
      form.setValue('slug', generateSlug(watchedTitle));
    }
  }, [watchedTitle, form, step]);

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

  const nextStep = async () => {
    const fieldsToValidate = {
      1: ['title', 'slug', 'category'],
      2: ['startAt', 'endAt', 'city', 'state', 'address', 'capacity'],
      3: ['description'],
      4: []
    }[step] as any[];

    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      if (step === 3 && !imageFile) {
        toast({ variant: 'destructive', title: 'Imagem obrigatória', description: 'Por favor, envie uma capa para o evento.' });
        return;
      }
      setStep((s) => s + 1);
    }
  };

  const prevStep = () => setStep((s) => s - 1);

  const checkSlugUniqueness = async (slug: string) => {
    const q = query(collection(db, 'eventos'), where('slug', '==', slug));
    const snapshot = await getDocs(q);
    return snapshot.empty;
  };

  const handleSave = async (isDraft: boolean) => {
    if (!user) return;
    
    if (isDraft) setIsSavingDraft(true);
    else setIsLoading(true);

    try {
      const data = form.getValues();
      
      // Ensure unique slug
      let finalSlug = data.slug;
      let counter = 1;
      while (!(await checkSlugUniqueness(finalSlug))) {
        finalSlug = `${data.slug}-${counter}`;
        counter++;
      }

      // 1. Upload Image
      let coverUrl = '';
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const imageRef = ref(storage, `events/temp-${Date.now()}.${fileExt}`);
        const snapshot = await uploadBytes(imageRef, imageFile);
        coverUrl = await getDownloadURL(snapshot.ref);
      }

      // 2. Create Event Doc
      const eventData = {
        ownerId: user.uid,
        title: data.title,
        slug: finalSlug,
        category: data.category,
        tags: data.tags?.split(',').map(t => t.trim()) || [],
        startAt: Timestamp.fromDate(new Date(data.startAt)),
        endAt: Timestamp.fromDate(new Date(data.endAt)),
        city: data.city,
        state: data.state,
        address: data.address,
        mapUrl: data.mapUrl || '',
        capacity: data.capacity,
        coverUrl: coverUrl,
        description: data.description,
        agendaItems: data.agenda,
        contact: {
          whatsapp: data.whatsapp || '',
          email: data.email || '',
          instagram: data.instagram || '',
        },
        status: isDraft ? 'draft' : 'published',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const eventRef = await addDoc(collection(db, 'eventos'), eventData);

      // 3. Create Certificate Sub-doc
      await setDoc(doc(db, 'eventos', eventRef.id, 'certificateConfig', 'main'), {
        enabled: data.certEnabled,
        attendanceMode: data.attendanceMode,
        title: data.certTitle || 'Certificado de Participação',
        bodyTemplate: data.certBody || '',
        workloadHours: data.certHours || '',
        signatureName: data.certSignatureName || '',
        updatedAt: serverTimestamp(),
      });

      toast({
        title: isDraft ? 'Rascunho salvo!' : 'Evento publicado!',
        description: `O evento "${data.title}" foi criado com sucesso.`,
      });

      router.push('/dashboard');
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: error.message || 'Ocorreu um problema ao salvar o evento.',
      });
    } finally {
      setIsLoading(false);
      setIsSavingDraft(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Header Sticky */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b pb-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Admin > Eventos > Novo</div>
            <h1 className="text-3xl font-black font-headline tracking-tight">Criar Novo Evento</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => handleSave(true)} disabled={isSavingDraft || isLoading}>
              {isSavingDraft && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Rascunho
            </Button>
            <Button 
              className="bg-primary hover:bg-primary/90 text-white font-bold" 
              onClick={() => handleSave(false)}
              disabled={isLoading || isSavingDraft || step < 4}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Publicar Evento
            </Button>
          </div>
        </div>
        
        {/* Step Indicator */}
        <div className="flex justify-between mt-8 relative">
           <div className="absolute top-1/2 left-0 w-full h-0.5 bg-muted -translate-y-1/2 z-0" />
           {[1, 2, 3, 4].map((s) => (
             <div 
               key={s} 
               className={cn(
                 "relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all border-4",
                 step === s ? "bg-primary border-primary text-white scale-110 shadow-lg shadow-primary/20" : 
                 step > s ? "bg-secondary border-secondary text-white" : "bg-background border-muted text-muted-foreground"
               )}
             >
               {step > s ? <CheckCircle2 className="h-6 w-6" /> : s}
               <span className="absolute -bottom-7 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                  {s === 1 ? 'Básico' : s === 2 ? 'Logística' : s === 3 ? 'Conteúdo' : 'Revisão'}
               </span>
             </div>
           ))}
        </div>
      </div>

      <Form {...form}>
        <div className="space-y-8">
          {/* Step 1: Básico */}
          {step === 1 && (
            <Card className="border-none shadow-xl">
              <CardHeader className="bg-muted/30">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Informações Básicas
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título do Evento</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Workshop Master em Mechas" {...field} className="h-12 text-lg font-medium" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Link Amigável (Slug)</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-1 bg-muted/50 rounded-md px-3 border focus-within:ring-2 ring-primary">
                            <span className="text-muted-foreground text-sm">eventomassa.com.br/</span>
                            <input {...field} className="bg-transparent h-10 outline-none text-sm w-full" />
                          </div>
                        </FormControl>
                        <FormDescription>Usado no link do seu evento.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoria</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Workshop">Workshop</SelectItem>
                            <SelectItem value="Palestra">Palestra</SelectItem>
                            <SelectItem value="Curso">Curso</SelectItem>
                            <SelectItem value="Show">Show</SelectItem>
                            <SelectItem value="Networking">Networking</SelectItem>
                            <SelectItem value="Outros">Outros</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="belezas, mechas, workshop, maceio" {...field} />
                      </FormControl>
                      <FormDescription>Separe as palavras por vírgula.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 2: Logística */}
          {step === 2 && (
            <Card className="border-none shadow-xl">
              <CardHeader className="bg-muted/30">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Data, Local e Capacidade
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <FormField
                    control={form.control}
                    name="startAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Início do Evento</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Término do Evento</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem className="md:col-span-1">
                        <FormLabel>Cidade</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Maceió" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem className="md:col-span-1">
                        <FormLabel>Estado</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: AL" maxLength={2} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="capacity"
                    render={({ field }) => (
                      <FormItem className="md:col-span-1">
                        <FormLabel>Capacidade Total</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço Completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Rua, Número, Bairro, Complemento" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mapUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Link do Google Maps (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://goo.gl/maps/..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 3: Conteúdo */}
          {step === 3 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <Card className="border-none shadow-xl overflow-hidden">
                  <CardHeader className="bg-muted/30">
                    <CardTitle className="flex items-center gap-2">
                      <ImageIcon className="h-5 w-5 text-primary" />
                      Mídia e Descrição
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <div className="space-y-2">
                      <FormLabel>Capa do Evento (16:9 recomendado)</FormLabel>
                      <div 
                        className={cn(
                          "relative h-64 w-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all group overflow-hidden bg-muted/20",
                          imagePreview ? "border-primary/50" : "border-muted-foreground/20 hover:border-primary/50"
                        )}
                      >
                        {imagePreview ? (
                          <>
                            <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                               <Button variant="destructive" onClick={() => { setImageFile(null); setImagePreview(null); }}>
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Remover Imagem
                               </Button>
                            </div>
                          </>
                        ) : (
                          <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                            <Upload className="h-10 w-10 text-muted-foreground mb-4 group-hover:scale-110 group-hover:text-primary transition-all" />
                            <span className="text-sm font-bold text-muted-foreground">Clique para selecionar imagem</span>
                            <span className="text-xs text-muted-foreground/60 mt-1">PNG, JPG ou WEBP até 2MB</span>
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                          </label>
                        )}
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição Detalhada</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Conte tudo sobre o seu evento..." 
                              className="min-h-[250px] resize-none" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>Mínimo de 50 caracteres.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card className="border-none shadow-xl overflow-hidden">
                  <CardHeader className="bg-muted/30 flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <CalendarIcon className="h-5 w-5 text-primary" />
                      Programação (Opcional)
                    </CardTitle>
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ time: '', title: '', description: '' })}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Item
                    </Button>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    {fields.map((item, index) => (
                      <div key={item.id} className="flex gap-4 p-4 bg-muted/10 rounded-lg border group relative">
                        <div className="w-24 shrink-0">
                          <Input placeholder="08:00" {...form.register(`agenda.${index}.time`)} />
                        </div>
                        <div className="flex-grow space-y-2">
                          <Input placeholder="Título da atividade" {...form.register(`agenda.${index}.title`)} />
                          <Input placeholder="Descrição curta (opcional)" {...form.register(`agenda.${index}.description`)} />
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {fields.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground italic text-sm">
                        Nenhum item de programação adicionado.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-8">
                 <Card className="border-none shadow-xl overflow-hidden">
                    <CardHeader className="bg-muted/30">
                      <CardTitle className="text-sm font-bold uppercase tracking-widest">Contato do Organizador</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        <FormField
                          control={form.control}
                          name="whatsapp"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>WhatsApp</FormLabel>
                              <FormControl>
                                <Input placeholder="(00) 00000-0000" {...field} />
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
                              <FormLabel>E-mail</FormLabel>
                              <FormControl>
                                <Input placeholder="contato@empresa.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="instagram"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Instagram</FormLabel>
                              <FormControl>
                                <div className="flex items-center gap-1 bg-muted/50 rounded-md px-3 border">
                                  <span className="text-muted-foreground text-sm">@</span>
                                  <input {...field} className="bg-transparent h-10 outline-none text-sm w-full" placeholder="usuario" />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                    </CardContent>
                 </Card>
              </div>
            </div>
          )}

          {/* Step 4: Configurações */}
          {step === 4 && (
            <div className="space-y-8">
              <Card className="border-none shadow-xl overflow-hidden">
                <CardHeader className="bg-muted/30">
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-primary" />
                    Configurações Adicionais
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-8">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <h3 className="font-bold text-lg">Modelo de Presença</h3>
                        <p className="text-sm text-muted-foreground mb-4">Como o sistema deve validar a presença para liberar o certificado.</p>
                        <FormField
                          control={form.control}
                          name="attendanceMode"
                          render={({ field }) => (
                            <FormItem>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-12 border-2">
                                    <SelectValue placeholder="Selecione o modo" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="STRICT">STRICT (Check-in + Check-out)</SelectItem>
                                  <SelectItem value="EOD">EOD (Check-in + Finalização do Dia)</SelectItem>
                                  <SelectItem value="SIMPLE">SIMPLE (Apenas Check-in)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="space-y-4 bg-muted/20 p-6 rounded-xl border border-dashed">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h3 className="font-bold text-lg">Certificados e Diplomas</h3>
                            <p className="text-xs text-muted-foreground">Emitir automaticamente após o evento.</p>
                          </div>
                          <FormField
                            control={form.control}
                            name="certEnabled"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        {form.watch('certEnabled') && (
                          <div className="space-y-4 pt-4 animate-in slide-in-from-top-2 duration-300">
                             <FormField
                              control={form.control}
                              name="certTitle"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Título do Certificado</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="certBody"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Corpo do Texto</FormLabel>
                                  <FormControl>
                                    <Textarea rows={4} {...field} className="text-xs" />
                                  </FormControl>
                                  <FormDescription className="text-[10px]">Use placeholders: {"{NAME}, {EVENT_TITLE}, {CITY}, {DATE}, {HOURS}"}</FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="grid grid-cols-2 gap-4">
                               <FormField
                                control={form.control}
                                name="certHours"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">Carga Horária</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Ex: 12h" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                               <FormField
                                control={form.control}
                                name="certSignatureName"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">Nome p/ Assinatura</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Nome do Responsável" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                   </div>
                </CardContent>
              </Card>

              {/* Final Review Mockup */}
              <div className="bg-muted/10 border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-6">
                 <div className="bg-primary/10 p-6 rounded-full">
                    <CheckCircle2 className="h-12 w-12 text-primary" />
                 </div>
                 <div className="space-y-2">
                    <h2 className="text-2xl font-bold font-headline">Tudo pronto para o lançamento?</h2>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Revise todas as informações antes de publicar. Você poderá editar o evento a qualquer momento após a publicação.
                    </p>
                 </div>
                 <div className="flex flex-wrap justify-center gap-8 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-green-100 text-green-700">OK</Badge>
                      <span className="font-bold">Informações Básicas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-green-100 text-green-700">OK</Badge>
                      <span className="font-bold">Logística e Data</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-green-100 text-green-700">OK</Badge>
                      <span className="font-bold">Banner de Capa</span>
                    </div>
                 </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-6">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={prevStep} 
              disabled={step === 1 || isLoading || isSavingDraft}
              className="font-bold"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            
            {step < 4 ? (
              <Button 
                type="button" 
                onClick={nextStep} 
                className="bg-secondary hover:bg-secondary/90 text-white font-bold px-8 rounded-full h-12 shadow-lg shadow-secondary/20"
              >
                Continuar
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button 
                type="button" 
                onClick={() => handleSave(false)} 
                disabled={isLoading || isSavingDraft}
                className="bg-primary hover:bg-primary/90 text-white font-bold px-12 rounded-full h-12 shadow-lg shadow-primary/20"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                PUBLICAR AGORA
              </Button>
            )}
          </div>
        </div>
      </Form>
    </div>
  );
}
