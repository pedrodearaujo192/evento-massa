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
  deleteDoc, 
  serverTimestamp,
  Timestamp,
  where,
  getDocs
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
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
  Trash2,
  Edit,
  MoreHorizontal,
  Save,
  ImageIcon,
  UserPlus,
  Search,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

interface Order {
  id: string;
  customer: {
    fullName: string;
    email: string;
    document: string;
  };
  items: Array<{ name: string; qty: number }>;
  total: number;
  status: 'pendente' | 'pago' | 'cancelado';
  createdAt: Timestamp;
}

export default function ManageEventPage() {
  const { eventId } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [event, setEvent] = useState<any>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  
  // States para UI
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isAddingTicket, setIsAddingTicket] = useState(false);
  const [isAddingGuest, setIsAddingGuest] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Modais
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketType | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId || !user) return;

    const unsubEvent = onSnapshot(doc(db, 'eventos', eventId as string), (doc) => {
      if (doc.exists()) {
        setEvent({ id: doc.id, ...doc.data() });
      } else {
        router.push('/dashboard');
      }
    });

    const unsubTickets = onSnapshot(
      query(collection(db, 'eventos', eventId as string, 'ticketTypes')),
      (snapshot) => {
        setTicketTypes(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TicketType)));
      }
    );

    const unsubOrders = onSnapshot(
      query(collection(db, 'pedidos'), where('eventId', '==', eventId)),
      (snapshot) => {
        setOrders(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
        setLoading(false);
      }
    );

    return () => { unsubEvent(); unsubTickets(); unsubOrders(); };
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
    const ticketId = formData.get('ticketTypeId') as string;
    const selectedTicket = ticketTypes.find(t => t.id === ticketId);

    try {
      await addDoc(collection(db, 'pedidos'), {
        eventId,
        customer: {
          fullName: formData.get('fullName'),
          email: formData.get('email'),
          document: formData.get('document'),
          address: 'Venda Manual',
          city: '-',
          zip: '-'
        },
        items: [{
          id: ticketId,
          name: selectedTicket?.name || 'Ingresso',
          qty: 1,
          priceCents: selectedTicket?.priceCents || 0
        }],
        total: (selectedTicket?.priceCents || 0) / 100,
        status: 'pago',
        createdAt: serverTimestamp(),
        type: 'manual'
      });

      // Incrementar soldCount no ticketType
      if (selectedTicket) {
        await updateDoc(doc(db, 'eventos', eventId as string, 'ticketTypes', ticketId), {
          soldCount: (selectedTicket.soldCount || 0) + 1
        });
      }

      setIsGuestModalOpen(false);
      toast({ title: 'Sucesso', description: 'Participante adicionado com sucesso.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível adicionar o convidado.' });
    } finally {
      setIsAddingGuest(false);
    }
  };

  const handleSaveTicket = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsAddingTicket(true);
    const formData = new FormData(e.currentTarget);
    
    const data = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      priceType: formData.get('priceType') as 'paid' | 'free',
      priceCents: Math.round(Number(formData.get('price')) * 100),
      quantity: Number(formData.get('quantity')),
      active: formData.get('active') === 'on',
      salesStartAt: Timestamp.fromDate(new Date(formData.get('salesStartAt') as string)),
      salesEndAt: Timestamp.fromDate(new Date(formData.get('salesEndAt') as string)),
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingTicket) {
        await updateDoc(doc(db, 'eventos', eventId as string, 'ticketTypes', editingTicket.id), data);
      } else {
        await addDoc(collection(db, 'eventos', eventId as string, 'ticketTypes'), {
          ...data,
          soldCount: 0,
          createdAt: serverTimestamp(),
        });
      }
      setIsTicketModalOpen(false);
      setEditingTicket(null);
      toast({ title: 'Sucesso', description: 'Ingresso salvo com sucesso.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível salvar o ingresso.' });
    } finally {
      setIsAddingTicket(false);
    }
  };

  const totalSold = useMemo(() => orders.filter(o => o.status === 'pago').reduce((acc, o) => acc + o.items.reduce((a, i) => a + i.qty, 0), 0), [orders]);
  const totalCapacity = useMemo(() => ticketTypes.reduce((acc, t) => acc + t.quantity, 0), [ticketTypes]);
  const totalRevenue = useMemo(() => orders.filter(o => o.status === 'pago').reduce((acc, o) => acc + o.total, 0), [orders]);

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
              <Button variant="secondary" className="font-bold"><UserPlus className="mr-2 h-4 w-4" /> ADICIONAR CONVIDADO</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Venda Manual / Convidado</DialogTitle></DialogHeader>
              <form onSubmit={handleAddGuest} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <Input name="fullName" placeholder="Ex: João da Silva" required />
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input name="email" type="email" placeholder="email@exemplo.com" required />
                </div>
                <div className="space-y-2">
                  <Label>CPF/CNPJ</Label>
                  <Input name="document" placeholder="000.000.000-00" required />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Ingresso</Label>
                  <select name="ticketTypeId" className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                    <option value="">Selecione o ingresso...</option>
                    {ticketTypes.map(t => (
                      <option key={t.id} value={t.id}>{t.name} - {t.priceType === 'free' ? 'Grátis' : `R$ ${(t.priceCents/100).toFixed(2)}`}</option>
                    ))}
                  </select>
                </div>
                <DialogFooter><Button type="submit" className="w-full" disabled={isAddingGuest}>{isAddingGuest && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} CADASTRAR PARTICIPANTE</Button></DialogFooter>
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
          <TabsTrigger value="settings" className="gap-2"><Settings className="h-4 w-4" /> Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-none shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Ingressos Vendidos</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{totalSold}</div><p className="text-xs text-muted-foreground">de {totalCapacity} emitidos</p></CardContent></Card>
            <Card className="border-none shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Receita Bruta</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">R$ {totalRevenue.toFixed(2).replace('.', ',')}</div></CardContent></Card>
            <Card className="border-none shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Ocupação</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{totalCapacity > 0 ? Math.round((totalSold / totalCapacity) * 100) : 0}%</div></CardContent></Card>
            <Card className="border-none shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Capacidade Local</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{event.capacity}</div></CardContent></Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2 border-none shadow-sm">
               <CardHeader><CardTitle>Informações do Evento</CardTitle></CardHeader>
               <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 text-sm"><Calendar className="h-4 w-4 text-primary" /> {event.startAt ? format(event.startAt.toDate(), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR }) : 'Não definido'}</div>
                  <div className="flex items-center gap-3 text-sm"><MapPin className="h-4 w-4 text-primary" /> {event.address}, {event.city} - {event.state}</div>
                  <div className="pt-4"><p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.description}</p></div>
               </CardContent>
            </Card>
            <Card className="border-none shadow-sm overflow-hidden">
               <div className="relative aspect-video w-full">
                  <Image src={event.coverUrl || "https://picsum.photos/seed/default/600/400"} alt="Capa" fill className="object-cover" />
               </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="participants" className="space-y-4">
           <Card className="border-none shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Participante</TableHead>
                    <TableHead>Ingresso</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div className="font-bold">{order.customer.fullName}</div>
                        <div className="text-xs text-muted-foreground">{order.customer.email}</div>
                      </TableCell>
                      <TableCell>
                         {order.items.map((i, idx) => (
                           <div key={idx} className="text-xs font-medium bg-muted px-2 py-1 rounded inline-block mr-1">{i.qty}x {i.name}</div>
                         ))}
                      </TableCell>
                      <TableCell>
                        <Badge variant={order.status === 'pago' ? 'default' : 'outline'} className={order.status === 'pago' ? 'bg-green-500' : ''}>
                          {order.status === 'pago' ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                          {order.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {order.createdAt ? format(order.createdAt.toDate(), "dd/MM/yyyy HH:mm") : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {orders.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-20 text-muted-foreground">Nenhum participante registrado ainda.</TableCell></TableRow>}
                </TableBody>
              </Table>
           </Card>
        </TabsContent>

        {/* ... outras abas (tickets, settings) mantêm o comportamento anterior ... */}
        <TabsContent value="tickets" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Tipos de Ingresso</h2>
            <Button onClick={() => { setEditingTicket(null); setIsTicketModalOpen(true); }} className="bg-secondary text-white font-bold"><Plus className="mr-2 h-4 w-4" /> Adicionar Ingresso</Button>
          </div>
          <Card className="border-none shadow-sm overflow-hidden">
             {/* Tabela de Ingressos Reutilizada */}
             <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Ingresso</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Vendas</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ticketTypes.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell><div className="font-bold">{ticket.name}</div></TableCell>
                      <TableCell>{ticket.priceType === 'free' ? 'Grátis' : `R$ ${(ticket.priceCents / 100).toFixed(2)}`}</TableCell>
                      <TableCell>{ticket.soldCount} / {ticket.quantity}</TableCell>
                      <TableCell><Badge variant={ticket.active ? 'default' : 'outline'}>{ticket.active ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                      <TableCell className="text-right">
                         <Button variant="ghost" size="icon" onClick={() => { setEditingTicket(ticket); setIsTicketModalOpen(true); }}><Edit className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
             </Table>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
           {/* Formulário de Configuração Reutilizado */}
           <Card className="border-none shadow-sm p-6">
              <p className="text-muted-foreground text-center py-10">Use esta aba para editar as informações básicas do evento enviadas no formulário inicial.</p>
           </Card>
        </TabsContent>
      </Tabs>
      
      {/* Modal Ticket (Reutilizado) */}
      <Dialog open={isTicketModalOpen} onOpenChange={setIsTicketModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingTicket ? 'Editar Ingresso' : 'Novo Ingresso'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveTicket} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Ingresso</Label>
              <Input name="name" defaultValue={editingTicket?.name} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <select name="priceType" defaultValue={editingTicket?.priceType || 'paid'} className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="paid">Pago</option>
                  <option value="free">Gratuito</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Preço (R$)</Label>
                <Input name="price" type="number" step="0.01" defaultValue={editingTicket ? (editingTicket.priceCents / 100).toFixed(2) : '0.00'} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Quantidade Disponível</Label>
              <Input name="quantity" type="number" defaultValue={editingTicket?.quantity || 100} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Início Vendas</Label>
                <Input name="salesStartAt" type="datetime-local" defaultValue={editingTicket?.salesStartAt ? format(editingTicket.salesStartAt.toDate(), "yyyy-MM-dd'T'HH:mm") : ''} required />
              </div>
              <div className="space-y-2">
                <Label>Fim Vendas</Label>
                <Input name="salesEndAt" type="datetime-local" defaultValue={editingTicket?.salesEndAt ? format(editingTicket.salesEndAt.toDate(), "yyyy-MM-dd'T'HH:mm") : ''} required />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch name="active" defaultChecked={editingTicket ? editingTicket.active : true} />
              <Label>Ativo para Venda</Label>
            </div>
            <Button type="submit" className="w-full" disabled={isAddingTicket}>{isAddingTicket && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar Ingresso</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
