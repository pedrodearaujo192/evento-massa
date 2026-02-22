
'use client';

import { useState, useEffect, useMemo } from 'react';
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
  writeBatch
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
  RotateCcw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Image from 'next/image';
import Link from 'next/link';

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
  userName: string;
  userEmail: string;
  ticketName: string;
  status: 'ativo' | 'usado' | 'cancelado';
  checkedInAt: Timestamp | null;
  createdAt: Timestamp;
}

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
  
  // States for Editing
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId || !user) return;

    const unsubEvent = onSnapshot(doc(db, 'eventos', eventId as string), (doc) => {
      if (doc.exists()) {
        setEvent({ id: doc.id, ...doc.data() });
      } else {
        router.push('/dashboard');
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
        // Sort in client side to avoid index requirement error
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

    return () => { unsubEvent(); unsubTicketTypes(); unsubTickets(); };
  }, [eventId, user, router]);

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

  const handleAddGuest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsAddingGuest(true);
    const formData = new FormData(e.currentTarget);
    const ticketTypeId = formData.get('ticketTypeId') as string;
    const selectedTicketType = ticketTypes.find(t => t.id === ticketTypeId);

    try {
      const batch = writeBatch(db);
      const orderRef = doc(collection(db, 'pedidos'));
      batch.set(orderRef, {
        eventId,
        userId: 'manual',
        customer: {
          fullName: formData.get('fullName'),
          email: formData.get('email'),
          document: formData.get('document'),
          address: 'Venda Manual',
          city: '-',
          zip: '-'
        },
        items: [{
          id: ticketTypeId,
          name: selectedTicketType?.name || 'Ingresso',
          qty: 1,
          priceCents: 0
        }],
        total: 0,
        status: 'pago',
        createdAt: serverTimestamp(),
        type: 'manual'
      });

      const ticketRef = doc(collection(db, 'ingressos'));
      batch.set(ticketRef, {
        orderId: orderRef.id,
        eventId,
        userName: formData.get('fullName'),
        userEmail: formData.get('email'),
        ticketName: selectedTicketType?.name || 'Ingresso',
        status: 'ativo',
        checkedInAt: null,
        createdAt: serverTimestamp()
      });

      const typeRef = doc(db, 'eventos', eventId as string, 'ticketTypes', ticketTypeId);
      batch.update(typeRef, {
        soldCount: (selectedTicketType?.soldCount || 0) + 1
      });

      await batch.commit();
      setIsGuestModalOpen(false);
      toast({ title: 'Sucesso', description: 'Convidado adicionado com sucesso.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível adicionar o convidado.' });
    } finally {
      setIsAddingGuest(false);
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSavingEdit(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      const updateData: any = {
        title: formData.get('title'),
        description: formData.get('description'),
        category: formData.get('category'),
        city: formData.get('city'),
        state: formData.get('state'),
        address: formData.get('address'),
        capacity: Number(formData.get('capacity')),
        startAt: formData.get('startAt') ? Timestamp.fromDate(new Date(formData.get('startAt') as string)) : event.startAt,
        endAt: formData.get('endAt') ? Timestamp.fromDate(new Date(formData.get('endAt') as string)) : event.endAt,
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
        
        // Remove old image if exists
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
              <span className="text-xs text-muted-foreground uppercase tracking-wider">{event.category}</span>
            </div>
            <h1 className="text-3xl font-black font-headline tracking-tight">
               <span className="text-secondary">Gerenciar:</span> {event.title}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {event.status === 'draft' && (
            <Button className="bg-primary hover:bg-primary/90 text-white font-bold px-8" onClick={handlePublish} disabled={isUpdatingStatus}>
              {isUpdatingStatus ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'PUBLICAR EVENTO'}
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
                  <Input name="document" required />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Ingresso</Label>
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
          <TabsTrigger value="tickets" className="gap-2"><Ticket className="h-4 w-4" /> Lotes</TabsTrigger>
          <TabsTrigger value="participants" className="gap-2"><Users className="h-4 w-4" /> Participantes</TabsTrigger>
          <TabsTrigger value="checkin" className="gap-2"><UserCheck className="h-4 w-4" /> Check-in</TabsTrigger>
          <TabsTrigger value="settings" className="gap-2"><Settings className="h-4 w-4" /> Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-none shadow-sm"><CardHeader className="pb-2 text-muted-foreground text-sm font-bold">VENDIDOS</CardHeader><CardContent><div className="text-3xl font-black">{totalSold} / {totalCapacity}</div></CardContent></Card>
            <Card className="border-none shadow-sm"><CardHeader className="pb-2 text-muted-foreground text-sm font-bold">PRESENÇA</CardHeader><CardContent><div className="text-3xl font-black">{totalCheckIns} ({totalSold > 0 ? Math.round((totalCheckIns/totalSold)*100) : 0}%)</div></CardContent></Card>
            <Card className="border-none shadow-sm"><CardHeader className="pb-2 text-muted-foreground text-sm font-bold">RECEITA ESTIMADA</CardHeader><CardContent><div className="text-3xl font-black text-secondary">R$ {tickets.length > 0 ? '---' : '0,00'}</div></CardContent></Card>
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
              <CardDescription>Visualize todos os inscritos e acesse seus ingressos individuais.</CardDescription>
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
                  <TableHead className="text-right">Ação</TableHead>
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
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/ingressos/${t.orderId}`} target="_blank">
                          <Eye className="mr-2 h-4 w-4" /> VER INGRESSO
                        </Link>
                      </Button>
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
              <CardTitle>Controle de Entrada</CardTitle>
              <CardDescription>Busque pelo nome ou código. Use "Estornar" para desfazer entradas erradas.</CardDescription>
              <div className="pt-4 flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Nome, e-mail ou código..." 
                    className="pl-10" 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                  />
                </div>
                <Badge variant="secondary" className="h-10 px-4 font-bold">{totalCheckIns} de {totalSold} confirmados</Badge>
              </div>
            </CardHeader>
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Participante</TableHead>
                  <TableHead>Ingresso</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
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
                        {t.status === 'usado' ? 'ENTROU' : 'PENDENTE'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right flex items-center justify-end gap-2">
                      {t.status !== 'usado' ? (
                        <Button size="sm" onClick={() => handleCheckIn(t.id)} className="bg-secondary text-white font-bold">
                          <UserCheck className="mr-2 h-4 w-4" /> CONFIRMAR
                        </Button>
                      ) : (
                        <>
                          <span className="text-xs text-muted-foreground font-bold flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4 text-green-500" /> {t.checkedInAt ? format(t.checkedInAt.toDate(), "HH:mm") : ''}
                          </span>
                          <Button variant="ghost" size="sm" onClick={() => handleUndoCheckIn(t.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                            <RotateCcw className="h-4 w-4 mr-1" /> ESTORNAR
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="tickets" className="space-y-6">
           <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold font-headline">Lotes e Preços</h2>
              <Button><Plus className="mr-2 h-4 w-4" /> Adicionar Lote</Button>
           </div>
           <Card className="border-none shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Capacidade</TableHead>
                    <TableHead>Vendas</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ticketTypes.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="font-bold">{t.name}</TableCell>
                      <TableCell>{t.priceType === 'free' ? 'Grátis' : `R$ ${(t.priceCents/100).toFixed(2)}`}</TableCell>
                      <TableCell>{t.quantity}</TableCell>
                      <TableCell>{t.soldCount}</TableCell>
                      <TableCell><Badge variant={t.active ? 'default' : 'outline'}>{t.active ? 'ATIVO' : 'INATIVO'}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
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
              <CardTitle>Editar Evento</CardTitle>
              <CardDescription>Atualize as informações principais e a capa do seu evento.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateEvent} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Título do Evento</Label>
                      <Input name="title" defaultValue={event.title} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Categoria</Label>
                      <Select name="category" defaultValue={event.category}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Workshop">Workshop</SelectItem>
                          <SelectItem value="Curso">Curso</SelectItem>
                          <SelectItem value="Masterclass">Masterclass</SelectItem>
                          <SelectItem value="Congresso">Congresso</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Data Início</Label>
                        <Input 
                          name="startAt" 
                          type="datetime-local" 
                          defaultValue={event.startAt ? format(event.startAt.toDate(), "yyyy-MM-dd'T'HH:mm") : ''} 
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Data Término</Label>
                        <Input 
                          name="endAt" 
                          type="datetime-local" 
                          defaultValue={event.endAt ? format(event.endAt.toDate(), "yyyy-MM-dd'T'HH:mm") : ''} 
                          required 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label>Capa do Evento</Label>
                    <div className="relative aspect-video rounded-xl overflow-hidden border-2 border-dashed group">
                      {editImagePreview || event.coverUrl ? (
                        <>
                          <Image 
                            src={editImagePreview || event.coverUrl} 
                            alt="Preview" 
                            fill 
                            className="object-cover"
                          />
                          <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            <div className="text-white flex flex-col items-center">
                              <Upload className="h-8 w-8 mb-2" />
                              <span className="font-bold">Alterar Imagem</span>
                            </div>
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setEditImageFile(file);
                                  setEditImagePreview(URL.createObjectURL(file));
                                }
                              }}
                            />
                          </label>
                        </>
                      ) : (
                        <label className="flex flex-col items-center justify-center h-full cursor-pointer">
                          <ImageIcon className="h-10 w-10 text-muted-foreground mb-2" />
                          <span className="text-sm text-muted-foreground">Clique para subir</span>
                          <input type="file" className="hidden" />
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Descrição Completa</Label>
                  <Textarea name="description" defaultValue={event.description} className="min-h-[200px]" required />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label>Endereço</Label>
                    <Input name="address" defaultValue={event.address} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Cidade</Label>
                    <Input name="city" defaultValue={event.city} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Estado (UF)</Label>
                    <Input name="state" defaultValue={event.state} maxLength={2} required />
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t">
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
    </div>
  );
}
