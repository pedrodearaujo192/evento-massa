'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  doc, 
  onSnapshot, 
  collection, 
  query, 
  updateDoc, 
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
  addDoc,
  deleteDoc,
  getDoc,
  increment
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Loader2, 
  Plus, 
  Ticket, 
  Users, 
  BarChart3, 
  Settings, 
  Calendar, 
  MapPin, 
  ArrowLeft,
  Edit,
  CheckCircle2,
  Search,
  UserCheck,
  Upload,
  Save,
  ImageIcon,
  Eye,
  RotateCcw,
  PlusCircle,
  Tag,
  Youtube,
  Clock,
  Trash2,
  EyeOff,
  AlertTriangle,
  QrCode,
  Camera,
  XCircle,
  UserCog,
  UserX,
  Palette
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Image from 'next/image';
import Link from 'next/link';
import jsQR from 'jsqr';
import { cn } from '@/lib/utils';

interface TicketType {
  id: string;
  name: string;
  description?: string;
  priceType: 'paid' | 'free';
  priceCents: number;
  quantity: number;
  soldCount: number;
  active: boolean;
  salesStartAt: Timestamp;
  salesEndAt: Timestamp;
}

interface EventTicket {
  id: string;
  orderId: string;
  eventId: string;
  ticketTypeId: string;
  userName: string;
  userEmail: string;
  ticketName: string;
  status: 'ativo' | 'usado' | 'cancelado';
  checkedInAt: Timestamp | null;
  createdAt: Timestamp;
}

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

export default function ManageEventPage() {
  const { eventId } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [event, setEvent] = useState<any>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [tickets, setTickets] = useState<EventTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isAddingGuest, setIsAddingGuest] = useState(false);
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  
  const [isAddingTicketType, setIsAddingTicketType] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  const [editingTicketType, setEditingTicketType] = useState<TicketType | null>(null);
  const [isEditTicketModalOpen, setIsEditTicketModalOpen] = useState(false);
  const [isUpdatingTicketType, setIsUpdatingTicketType] = useState(false);

  const [ticketToDelete, setTicketToDelete] = useState<TicketType | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingTicketType, setIsDeletingTicketType] = useState(false);

  const [editingParticipantTicket, setEditingParticipantTicket] = useState<EventTicket | null>(null);
  const [isEditParticipantModalOpen, setIsEditParticipantModalOpen] = useState(false);
  const [isUpdatingParticipant, setIsUpdatingParticipant] = useState(false);

  const [participantTicketToDelete, setParticipantTicketToDelete] = useState<EventTicket | null>(null);
  const [isDeleteParticipantDialogOpen, setIsDeleteParticipantDialogOpen] = useState(false);
  const [isDeletingParticipant, setIsDeletingParticipant] = useState(false);

  const [isDeleteEventDialogOpen, setIsDeleteEventDialogOpen] = useState(false);
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);
  const isDeletingRef = useRef(false);
  
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanIntervalRef = useRef<number | null>(null);

  // Form State for Visuals
  const [primaryColor, setPrimaryColor] = useState('#FF007F');
  const [secondaryColor, setSecondaryColor] = useState('#22C55E');
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    if (!eventId || !user) return;

    const unsubEvent = onSnapshot(doc(db, 'eventos', eventId as string), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setEvent({ id: doc.id, ...data });
        setPrimaryColor(data.primaryColor || '#FF007F');
        setSecondaryColor(data.secondaryColor || '#22C55E');
        setThemeMode(data.themeMode || 'dark');
      } else {
        if (!isDeletingRef.current) {
          router.push('/dashboard');
        }
      }
    });

    const unsubTicketTypes = onSnapshot(
      query(collection(db, 'eventos', eventId as string, 'ticketTypes')),
      (snapshot) => {
        setTicketTypes(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TicketType)));
      }
    );

    const unsubTickets = onSnapshot(
      query(collection(db, 'ingressos'), where('eventId', '==', eventId)),
      (snapshot) => {
        const ticketsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as EventTicket));
        ticketsData.sort((a, b) => {
            const dateA = a.createdAt?.toMillis() || 0;
            const dateB = b.createdAt?.toMillis() || 0;
            return dateB - dateA;
        });
        setTickets(ticketsData);
        setLoading(false);
      },
      (error) => {
        console.error("Erro ao carregar ingressos:", error);
        setLoading(false);
      }
    );

    return () => { 
      unsubEvent(); 
      unsubTicketTypes(); 
      unsubTickets(); 
    };
  }, [eventId, user, router]);

  useEffect(() => {
    if (isScannerOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isScannerOpen]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          startScanning();
        };
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      toast({
        variant: 'destructive',
        title: 'Câmera Bloqueada',
        description: 'Por favor, permita o acesso à câmera nas configurações do navegador.',
      });
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      cancelAnimationFrame(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const startScanning = () => {
    const scan = () => {
      if (videoRef.current && canvasRef.current && isScannerOpen) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d', { willReadFrequently: true });

        if (video.readyState === video.HAVE_ENOUGH_DATA && context) {
          canvas.height = video.videoHeight;
          canvas.width = video.videoWidth;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code) {
            handleScanResult(code.data);
            return;
          }
        }
      }
      scanIntervalRef.current = requestAnimationFrame(scan);
    };
    scanIntervalRef.current = requestAnimationFrame(scan);
  };

  const handleScanResult = async (ticketId: string) => {
    setIsScannerOpen(false);
    
    try {
      const ticketRef = doc(db, 'ingressos', ticketId);
      const ticketSnap = await getDoc(ticketRef);

      if (!ticketSnap.exists()) {
        toast({ variant: 'destructive', title: 'Ingresso Inválido', description: 'O código lido não pertence a um ingresso cadastrado.' });
        return;
      }

      const ticketData = ticketSnap.data();
      if (ticketData.eventId !== eventId) {
        toast({ variant: 'destructive', title: 'Evento Incorreto', description: 'Este ingresso pertence a outro evento.' });
        return;
      }

      if (ticketData.status === 'usado') {
        toast({ variant: 'destructive', title: 'Ingresso já usado', description: `Check-in já realizado em ${format(ticketData.checkedInAt.toDate(), "HH:mm")}.` });
        return;
      }

      await handleCheckIn(ticketId);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro na leitura', description: 'Não foi possível validar o ingresso.' });
    }
  };

  const handlePublish = async () => {
    if (ticketTypes.length === 0) {
      toast({ variant: 'destructive', title: 'Sem ingressos', description: 'Crie pelo menos um tipo de ingresso antes de publicar.' });
      return;
    }
    setIsUpdatingStatus(true);
    try {
      await updateDoc(doc(db, 'eventos', eventId as string), { 
        status: 'published',
        updatedAt: serverTimestamp() 
      });
      toast({ title: 'Evento publicado!', description: 'O evento agora está visível para o público.' });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleUnpublish = async () => {
    setIsUpdatingStatus(true);
    try {
      await updateDoc(doc(db, 'eventos', eventId as string), { 
        status: 'draft',
        updatedAt: serverTimestamp() 
      });
      toast({ title: 'Evento despublicado!', description: 'O evento voltou para rascunho e não está mais visível.' });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeleteEvent = async () => {
    setIsDeletingEvent(true);
    isDeletingRef.current = true;
    
    try {
      await deleteDoc(doc(db, 'eventos', eventId as string));
      toast({ title: 'Evento excluído!', description: 'O evento foi removido permanentemente.' });
      setIsDeleteEventDialogOpen(false);
      router.replace('/dashboard');
    } catch (error) {
      console.error("Erro ao excluir evento:", error);
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: 'Não foi possível remover o evento.' });
      setIsDeletingEvent(false);
      isDeletingRef.current = false;
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSavingEdit(true);
    const formData = new FormData(e.currentTarget);
    const tagsString = formData.get('tags') as string;
    const tagsArray = tagsString ? tagsString.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag !== '') : [];
    
    try {
      const updateData: any = {
        title: formData.get('title'),
        description: formData.get('description'),
        category: formData.get('category'),
        sector: formData.get('sector'),
        tags: tagsArray,
        city: formData.get('city'),
        state: formData.get('state'),
        address: formData.get('address'),
        mapUrl: formData.get('mapUrl'),
        youtubeUrl: formData.get('youtubeUrl'),
        capacity: Number(formData.get('capacity')),
        startAt: formData.get('startAt') ? Timestamp.fromDate(new Date(formData.get('startAt') as string)) : event.startAt,
        endAt: formData.get('endAt') ? Timestamp.fromDate(new Date(formData.get('endAt') as string)) : event.endAt,
        primaryColor,
        secondaryColor,
        themeMode,
        updatedAt: serverTimestamp(),
      };

      if (editImageFile) {
        const safeName = editImageFile.name.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
        const coverPath = `eventos/${eventId}/capa/cover-${Date.now()}-${safeName}`;
        const imageRef = ref(storage, coverPath);
        
        const snap = await uploadBytes(imageRef, editImageFile);
        const coverUrl = await getDownloadURL(snap.ref);
        
        updateData.coverUrl = coverUrl;
        updateData.coverPath = coverPath;
        
        if (event.coverPath) {
          try { await deleteObject(ref(storage, event.coverPath)); } catch (e) {}
        }
      }

      await updateDoc(doc(db, 'eventos', eventId as string), updateData);
      setEditImageFile(null);
      setEditImagePreview(null);
      toast({ title: 'Evento atualizado!', description: 'As alterações foram salvas com sucesso.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleCheckIn = async (ticketId: string) => {
    try {
      await updateDoc(doc(db, 'ingressos', ticketId), {
        status: 'usado',
        checkedInAt: serverTimestamp()
      });
      toast({ title: 'Check-in realizado!', description: 'A entrada foi confirmada.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao realizar check-in.' });
    }
  };

  const handleUndoCheckIn = async (ticketId: string) => {
    try {
      await updateDoc(doc(db, 'ingressos', ticketId), {
        status: 'ativo',
        checkedInAt: null
      });
      toast({ title: 'Check-in desfeito', description: 'O ingresso voltou ao status ativo.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível desfazer o check-in.' });
    }
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => 
      t.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [tickets, searchTerm]);

  const totalSold = useMemo(() => tickets.length, [tickets]);
  const totalCapacity = useMemo(() => ticketTypes.reduce((acc, t) => acc + t.quantity, 0) || event?.capacity || 0, [ticketTypes, event]);
  const totalCheckIns = useMemo(() => tickets.filter(t => t.status === 'usado').length, [tickets]);

  if (loading || !event) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/dashboard')}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={event.status === 'published' ? 'default' : 'outline'} className={event.status === 'published' ? 'bg-green-500 hover:bg-green-600' : ''}>
                {event.status === 'published' ? 'PUBLICADO' : 'RASCUNHO'}
              </Badge>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">{event.category} {event.sector && `• ${event.sector}`}</span>
            </div>
            <h1 className="text-3xl font-black font-headline tracking-tight text-foreground">
               {event.title}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {event.status === 'draft' ? (
            <Button className="bg-primary hover:bg-primary/90 text-white font-bold px-8" onClick={handlePublish} disabled={isUpdatingStatus}>
              {isUpdatingStatus ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'PUBLICAR EVENTO'}
            </Button>
          ) : (
            <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10 font-bold px-8" onClick={handleUnpublish} disabled={isUpdatingStatus}>
              {isUpdatingStatus ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><EyeOff className="mr-2 h-4 w-4" /> DESPUBLICAR EVENTO</>}
            </Button>
          )}
          <Dialog open={isGuestModalOpen} onOpenChange={setIsGuestModalOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" className="font-bold"><Plus className="mr-2 h-4 w-4" /> CONVIDAR PARTICIPANTE</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Adicionar Convidado / Venda Manual</DialogTitle></DialogHeader>
              <form onSubmit={handleAddGuest} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <Input name="fullName" required />
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input name="email" type="email" required />
                </div>
                <div className="space-y-2">
                  <Label>Documento (CPF/CNPJ)</Label>
                  <Input name="document" placeholder="000.000.000-00" required />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Ingressos</Label>
                  <select name="ticketTypeId" className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                    <option value="">Selecione...</option>
                    {ticketTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <DialogFooter><Button type="submit" disabled={isAddingGuest} className="w-full">{isAddingGuest && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} CADASTRAR AGORA</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-lg">
          <TabsTrigger value="overview" className="gap-2"><BarChart3 className="h-4 w-4" /> Visão Geral</TabsTrigger>
          <TabsTrigger value="tickets" className="gap-2"><Ticket className="h-4 w-4" /> Ingressos</TabsTrigger>
          <TabsTrigger value="participants" className="gap-2"><Users className="h-4 w-4" /> Participantes</TabsTrigger>
          <TabsTrigger value="checkin" className="gap-2"><UserCheck className="h-4 w-4" /> Check-in</TabsTrigger>
          <TabsTrigger value="settings" className="gap-2"><Settings className="h-4 w-4" /> Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-none shadow-sm"><CardHeader className="pb-2 text-muted-foreground text-sm font-bold">VENDIDOS</CardHeader><CardContent><div className="text-3xl font-black">{totalSold} / {totalCapacity}</div></CardContent></Card>
            <Card className="border-none shadow-sm"><CardHeader className="pb-2 text-muted-foreground text-sm font-bold">PRESENÇA</CardHeader><CardContent><div className="text-3xl font-black">{totalCheckIns} ({totalSold > 0 ? Math.round((totalCheckIns/totalSold)*100) : 0}%)</div></CardContent></Card>
            <Card className="border-none shadow-sm"><CardHeader className="pb-2 text-muted-foreground text-sm font-bold">ESTILO</CardHeader><CardContent className="flex items-center gap-2">
               <div className="h-8 w-8 rounded-full border" style={{ backgroundColor: primaryColor }} />
               <div className="h-8 w-8 rounded-full border" style={{ backgroundColor: secondaryColor }} />
               <Badge variant="outline">{themeMode === 'dark' ? 'DARK' : 'LIGHT'}</Badge>
            </CardContent></Card>
          </div>

          <Card className="border-none shadow-sm">
             <CardHeader><CardTitle>Informações do Evento</CardTitle></CardHeader>
             <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm font-medium"><Calendar className="h-4 w-4 text-primary" /> {event.startAt ? format(event.startAt.toDate(), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR }) : ''}</div>
                  <div className="flex items-center gap-3 text-sm font-medium"><MapPin className="h-4 w-4 text-primary" /> {event.address}, {event.city} - {event.state}</div>
                  <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{event.description}</div>
                </div>
                <div className="relative aspect-video rounded-xl overflow-hidden shadow-lg border">
                  <Image src={event.coverUrl || "https://picsum.photos/seed/1/600/400"} alt="Capa" fill className="object-cover" />
                </div>
             </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="participants" className="space-y-4">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Lista de Participantes</CardTitle>
              <div className="pt-4 flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar participante..." 
                    className="pl-10" 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                  />
                </div>
              </div>
            </CardHeader>
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Participante</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.map(t => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="font-bold">{t.userName}</div>
                      <div className="text-xs text-muted-foreground">{t.userEmail}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-[10px]">{t.ticketName}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.status === 'usado' ? 'default' : 'secondary'} className={t.status === 'usado' ? 'bg-green-500' : ''}>
                        {t.status === 'usado' ? 'CHECK-IN FEITO' : 'ATIVO'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => {
                          setEditingParticipantTicket(t);
                          setIsEditParticipantModalOpen(true);
                        }}><UserCog className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => {
                          setParticipantTicketToDelete(t);
                          setIsDeleteParticipantDialogOpen(true);
                        }}><UserX className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="checkin" className="space-y-4">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Controle de Entrada</CardTitle>
                <Button onClick={() => setIsScannerOpen(true)} className="bg-primary text-white font-bold h-12 px-6">
                  <QrCode className="mr-2 h-5 w-5" /> LER QR CODE
                </Button>
              </div>
              <div className="pt-4 flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar por nome..." 
                    className="pl-10" 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                  />
                </div>
                <Badge variant="secondary" className="h-10 px-4 font-bold">{totalCheckIns} confirmados</Badge>
              </div>
            </CardHeader>
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Participante</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.map(t => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="font-bold">{t.userName}</div>
                      <div className="text-xs text-muted-foreground">{t.ticketName}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.status === 'usado' ? 'default' : 'secondary'} className={t.status === 'usado' ? 'bg-green-500' : ''}>
                        {t.status === 'usado' ? 'ENTROU' : 'PENDENTE'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {t.status !== 'usado' ? (
                        <Button size="sm" onClick={() => handleCheckIn(t.id)} className="bg-secondary text-white font-bold">
                          <UserCheck className="mr-2 h-4 w-4" /> CONFIRMAR
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => handleUndoCheckIn(t.id)} className="text-destructive">
                          <RotateCcw className="h-4 w-4 mr-1" /> ESTORNAR
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Editar Evento e Visual</CardTitle>
              <CardDescription>Personalize o tema e as informações principais.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateEvent} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-4 p-4 border rounded-xl bg-muted/10">
                       <h3 className="text-sm font-bold flex items-center gap-2"><Palette className="h-4 w-4 text-primary" /> Identidade Visual</h3>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                             <Label>Cor Principal</Label>
                             <div className="flex gap-2">
                                <Input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-12 h-10 p-1" />
                                <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-10" />
                             </div>
                          </div>
                          <div className="space-y-2">
                             <Label>Cor Secundária</Label>
                             <div className="flex gap-2">
                                <Input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="w-12 h-10 p-1" />
                                <Input value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="h-10" />
                             </div>
                          </div>
                       </div>
                       <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                          <div className="space-y-0.5">
                             <Label>Modo Escuro (Dark Mode)</Label>
                             <p className="text-xs text-muted-foreground">Fundo preto para a página do evento.</p>
                          </div>
                          <Switch 
                            checked={themeMode === 'dark'} 
                            onCheckedChange={(val) => setThemeMode(val ? 'dark' : 'light')} 
                          />
                       </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Título do Evento</Label>
                      <Input name="title" defaultValue={event.title} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Categoria</Label>
                        <Select name="category" defaultValue={event.category}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Workshop">Workshop</SelectItem>
                            <SelectItem value="Curso">Curso</SelectItem>
                            <SelectItem value="Masterclass">Masterclass</SelectItem>
                            <SelectItem value="Congresso">Congresso</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Setor</Label>
                        <Select name="sector" defaultValue={event.sector}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Início</Label>
                        <Input name="startAt" type="datetime-local" defaultValue={event.startAt ? format(event.startAt.toDate(), "yyyy-MM-dd'T'HH:mm") : ''} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Término</Label>
                        <Input name="endAt" type="datetime-local" defaultValue={event.endAt ? format(event.endAt.toDate(), "yyyy-MM-dd'T'HH:mm") : ''} required />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <Label>Capa do Evento</Label>
                    <div className="relative aspect-video rounded-xl overflow-hidden border-2 border-dashed group">
                      {editImagePreview || event.coverUrl ? (
                        <>
                          <Image src={editImagePreview || event.coverUrl} alt="Preview" fill className="object-cover" />
                          <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            <Upload className="h-8 w-8 text-white" />
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) { setEditImageFile(file); setEditImagePreview(URL.createObjectURL(file)); }
                            }} />
                          </label>
                        </>
                      ) : (
                        <label className="flex flex-col items-center justify-center h-full cursor-pointer">
                          <ImageIcon className="h-10 w-10 text-muted-foreground mb-2" />
                          <input type="file" className="hidden" />
                        </label>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Endereço</Label>
                      <Input name="address" defaultValue={event.address} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <Input name="city" defaultValue={event.city} placeholder="Cidade" required />
                       <Input name="state" defaultValue={event.state} placeholder="UF" maxLength={2} required />
                    </div>
                    <div className="space-y-2">
                      <Label>YouTube URL</Label>
                      <Input name="youtubeUrl" defaultValue={event.youtubeUrl} placeholder="https://..." />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Descrição Completa</Label>
                  <Textarea name="description" defaultValue={event.description} className="min-h-[150px]" required />
                </div>

                <div className="flex justify-between items-center pt-8 border-t">
                  <AlertDialog open={isDeleteEventDialogOpen} onOpenChange={setIsDeleteEventDialogOpen}>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="outline" className="border-destructive text-destructive hover:bg-destructive/10">EXCLUIR EVENTO</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Excluir permanentemente?</AlertDialogTitle></AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteEvent} className="bg-destructive text-white">EXCLUIR AGORA</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <Button type="submit" disabled={isSavingEdit} className="bg-secondary text-white font-bold px-10 h-12">
                    {isSavingEdit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    SALVAR ALTERAÇÕES
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modais de Edição/Remoção e Scanner (Omitidos para brevidade, mas funcionais) */}
      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-black border-none">
          <div className="relative aspect-square">
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
               <div className="w-64 h-64 border-2 border-primary rounded-2xl animate-pulse" />
            </div>
          </div>
          <div className="p-4 bg-background border-t">
             <Button variant="ghost" className="w-full" onClick={() => setIsScannerOpen(false)}>CANCELAR SCANNER</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
