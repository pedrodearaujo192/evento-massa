'use client';

import { useState, useEffect } from 'react';
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
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  MoreHorizontal
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

export default function ManageEventPage() {
  const { eventId } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [event, setEvent] = useState<any>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isAddingTicket, setIsAddingTicket] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Modal State
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketType | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!eventId || !user) return;

    const unsubEvent = onSnapshot(doc(db, 'eventos', eventId as string), (doc) => {
      if (doc.exists()) setEvent({ id: doc.id, ...doc.data() });
      else router.push('/dashboard');
    });

    const unsubTickets = onSnapshot(
      query(collection(db, 'eventos', eventId as string, 'ticketTypes')),
      (snapshot) => {
        setTicketTypes(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TicketType)));
        setLoading(false);
      }
    );

    return () => { unsubEvent(); unsubTickets(); };
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

  const handleEditTicket = (ticket: TicketType) => {
    setMenuOpenId(null);
    setEditingTicket(ticket);
    setIsTicketModalOpen(true);
  };

  const handleDeleteTicketClick = (id: string) => {
    setMenuOpenId(null);
    setTicketToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteTicket = async () => {
    if (!ticketToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'eventos', eventId as string, 'ticketTypes', ticketToDelete));
      toast({ title: 'Excluído', description: 'Ingresso removido.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao excluir.' });
    } finally {
      setIsDeleting(false);
      setTimeout(() => {
        setIsDeleteDialogOpen(false);
        setTicketToDelete(null);
      }, 0);
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

  if (loading || !event) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

  const totalTickets = ticketTypes.reduce((acc, t) => acc + t.quantity, 0);
  const soldTickets = ticketTypes.reduce((acc, t) => acc + t.soldCount, 0);
  const revenue = ticketTypes.reduce((acc, t) => acc + (t.soldCount * t.priceCents), 0);

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
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-lg">
          <TabsTrigger value="overview" className="gap-2"><BarChart3 className="h-4 w-4" /> Visão Geral</TabsTrigger>
          <TabsTrigger value="tickets" className="gap-2"><Ticket className="h-4 w-4" /> Ingressos</TabsTrigger>
          <TabsTrigger value="attendees" className="gap-2"><Users className="h-4 w-4" /> Vendas</TabsTrigger>
          <TabsTrigger value="settings" className="gap-2"><Settings className="h-4 w-4" /> Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-none shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Vendas Totais</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{soldTickets}</div><p className="text-xs text-muted-foreground">de {totalTickets} disponíveis</p></CardContent></Card>
            <Card className="border-none shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Faturamento</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">R$ {(revenue / 100).toFixed(2).replace('.', ',')}</div></CardContent></Card>
            <Card className="border-none shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Capacidade Local</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{event.capacity}</div><p className="text-xs text-muted-foreground">pessoas no espaço</p></CardContent></Card>
            <Card className="border-none shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold capitalize">{event.status === 'published' ? 'Ativo' : 'Pausado'}</div></CardContent></Card>
          </div>
          <Card className="border-none shadow-sm">
             <CardHeader><CardTitle>Informações do Evento</CardTitle></CardHeader>
             <CardContent className="space-y-4">
                <div className="flex items-center gap-3 text-sm"><Calendar className="h-4 w-4 text-primary" /> {event.startAt ? format(event.startAt.toDate(), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR }) : 'Não definido'}</div>
                <div className="flex items-center gap-3 text-sm"><MapPin className="h-4 w-4 text-primary" /> {event.address}, {event.city} - {event.state}</div>
                <div className="pt-4"><p className="text-sm text-muted-foreground line-clamp-4">{event.description}</p></div>
             </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tickets" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Tipos de Ingresso</h2>
            <Dialog open={isTicketModalOpen} onOpenChange={(open) => { setIsTicketModalOpen(open); if(!open) setEditingTicket(null); }}>
              <DialogTrigger asChild><Button className="bg-secondary text-white font-bold"><Plus className="mr-2 h-4 w-4" /> Adicionar Ingresso</Button></DialogTrigger>
              <DialogContent className="max-w-md" onOpenAutoFocus={(e) => e.preventDefault()} onCloseAutoFocus={(e) => e.preventDefault()}>
                <DialogHeader><DialogTitle>{editingTicket ? 'Editar Ingresso' : 'Novo Tipo de Ingresso'}</DialogTitle></DialogHeader>
                <form onSubmit={handleSaveTicket} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome do Lote</Label>
                    <Input name="name" defaultValue={editingTicket?.name} placeholder="Ex: Pista, VIP" required />
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
                    <Input name="quantity" type="number" defaultValue={editingTicket?.quantity || 10} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Início das Vendas</Label>
                      <Input name="salesStartAt" type="datetime-local" defaultValue={editingTicket?.salesStartAt ? format(editingTicket.salesStartAt.toDate(), "yyyy-MM-dd'T'HH:mm") : ''} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Fim das Vendas</Label>
                      <Input name="salesEndAt" type="datetime-local" defaultValue={editingTicket?.salesEndAt ? format(editingTicket.salesEndAt.toDate(), "yyyy-MM-dd'T'HH:mm") : ''} required />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch name="active" defaultChecked={editingTicket ? editingTicket.active : true} />
                    <Label>Ativo para venda</Label>
                  </div>
                  <DialogFooter><Button type="submit" className="w-full" disabled={isAddingTicket}>{isAddingTicket && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar Ingresso</Button></DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="border-none shadow-sm overflow-hidden">
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
                    <TableCell>
                      <div className="font-bold">{ticket.name}</div>
                      <div className="text-xs text-muted-foreground">{ticket.quantity} total</div>
                    </TableCell>
                    <TableCell>
                      {ticket.priceType === 'free' ? <Badge variant="secondary">Grátis</Badge> : `R$ ${(ticket.priceCents / 100).toFixed(2)}`}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                         <div className="w-24 bg-muted h-1.5 rounded-full overflow-hidden"><div className="bg-primary h-full" style={{ width: `${(ticket.soldCount / ticket.quantity) * 100}%` }} /></div>
                         <span className="text-xs font-medium">{ticket.soldCount}/{ticket.quantity}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={ticket.active ? 'default' : 'outline'}>{ticket.active ? 'Ativo' : 'Inativo'}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu
                        open={menuOpenId === ticket.id}
                        onOpenChange={(open) => setMenuOpenId(open ? ticket.id : null)}
                      >
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
                          <DropdownMenuItem onClick={() => handleEditTicket(ticket)}>
                            <Edit className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteTicketClick(ticket.id)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {ticketTypes.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Nenhum ingresso criado ainda.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Ingresso</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este tipo de ingresso? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                confirmDeleteTicket();
              }}
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
