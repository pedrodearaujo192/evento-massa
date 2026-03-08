import type { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  nome: string;
  email: string;
  tipo: 'super_adm' | 'adm_evento' | 'usuario';
  empresa?: string;
  ativo: boolean;
  criadoEm: Timestamp;
}

export interface AgendaItem {
  time: string;
  title: string;
  description?: string;
}

export interface ContactInfo {
  whatsapp?: string;
  email?: string;
  instagram?: string;
}

export interface Event {
  id: string;
  ownerId: string;
  title: string;
  slug: string;
  category: string;
  sector: string;
  tags: string[];
  startAt: Timestamp;
  endAt: Timestamp;
  city: string;
  state: string;
  address: string;
  mapUrl?: string;
  youtubeUrl?: string;
  capacity: number;
  coverUrl: string;
  description: string;
  agendaItems: AgendaItem[];
  contact: ContactInfo;
  status: 'draft' | 'published' | 'ended';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TicketType {
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

export interface Order {
  id: string;
  userId: string;
  eventId: string;
  total: number;
  status: 'pendente' | 'pago' | 'cancelado';
  customer: {
    fullName: string;
    document: string;
    email: string;
    address: string;
    city: string;
    zip: string;
  };
  items: Array<{
    id: string;
    name: string;
    qty: number;
    priceCents: number;
  }>;
  createdAt: Timestamp;
}

export interface Ticket {
  id: string;
  eventId: string;
  ticketTypeId: string;
  orderId: string;
  userId: string;
  userName: string;
  userEmail: string;
  ticketName: string;
  status: 'ativo' | 'usado' | 'cancelado';
  checkedInAt: Timestamp | null;
  createdAt: Timestamp;
}
