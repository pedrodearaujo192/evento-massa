
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  doc, 
  onSnapshot, 
  collection, 
  query, 
  addDoc, 
  updateDoc, 
  serverTimestamp,
  Timestamp,
  where,
  getDocs,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  Clock,
  Search,
  UserCheck,
  QrCode
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Image from 'next/image';

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
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketType | null>(null);
  const [isSavingTicket, setIsSavingTicket] = useState(false);

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
      query(collection(db, 'ingressos'), where('eventId', '==', eventId), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setTickets(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as EventTicket)));
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
      
      // 1. Criar o pedido manual
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

      // 2. Criar o ingresso com QR Code
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

      // 3. Atualizar contador no ticketType
      const typeRef = doc(db, 'eventos', eventId as string, 'ticketTypes', ticketTypeId);
      batch.update(typeRef, {
        soldCount: (selectedTicketType?.soldCount || 0) + 1
      });

      await batch.commit();

      setIsGuestModalOpen(false);
      toast({ title: 'Sucesso', description: 'Convidado adicionado com sucesso.' });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível adicionar o convidado.' });
    } finally {
      setIsAddingGuest(false);
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

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => 
      t.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [tickets, searchTerm]);

  const totalSold = useMemo(() => tickets.length, [tickets]);
  const totalCapacity = useMemo(() => ticketTypes.reduce((acc, t) => acc + t.quantity, 0), [ticketTypes]);
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
          <TabsTrigger value="tickets" className="gap-2"><Ticket className="h-4 w-4" /> Ingressos</TabsTrigger>
          <TabsTrigger value="checkin" className="gap-2"><UserCheck className="h-4 w-4" /> Check-in</TabsTrigger>
          <TabsTrigger value="participants" className="gap-2"><Users className="h-4 w-4" /> Participantes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-none shadow-sm"><CardHeader className="pb-2 text-muted-foreground text-sm font-bold">VENDIDOS</CardHeader><CardContent><div className="text-3xl font-black">{totalSold} / {totalCapacity}</div></CardContent></Card>
            <Card className="border-none shadow-sm"><CardHeader className="pb-2 text-muted-foreground text-sm font-bold">PRESENÇA</CardHeader><CardContent><div className="text-3xl font-black">{totalCheckIns} ({totalSold > 0 ? Math.round((totalCheckIns/totalSold)*100) : 0}%)</div></CardContent></Card>
            <Card className="border-none shadow-sm"><CardHeader className="pb-2 text-muted-foreground text-sm font-bold">RECEITA</CardHeader><CardContent><div className="text-3xl font-black text-secondary">R$ {(tickets.length * 0).toFixed(2)}</div></CardContent></Card>
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

        <TabsContent value="checkin" className="space-y-4">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Controle de Entrada</CardTitle>
              <CardDescription>Busque pelo nome, e-mail ou código do ingresso para realizar o check-in.</CardDescription>
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
                <Badge variant="secondary" className="h-10 px-4 font-bold">{totalCheckIns} entradas confirmadas</Badge>
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
                      <div className="text-[10px] text-muted-foreground mt-1">ID: {t.id}</div>
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
                        <span className="text-xs text-muted-foreground font-bold flex items-center justify-end gap-1">
                          <CheckCircle2 className="h-4 w-4 text-green-500" /> {t.checkedInAt ? format(t.checkedInAt.toDate(), "HH:mm") : ''}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="tickets" className="space-y-6">
           {/* CRUD de Ingressos Reutilizado */}
           <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold font-headline">Lotes e Preços</h2>
              <Button onClick={() => { setEditingTicket(null); setIsTicketModalOpen(true); }}><Plus className="mr-2 h-4 w-4" /> Adicionar Lote</Button>
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
                        <Button variant="ghost" size="icon" onClick={() => { setEditingTicket(t); setIsTicketModalOpen(true); }}><Edit className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
           </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
