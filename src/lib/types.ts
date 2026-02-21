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
  tags: string[];
  startAt: Timestamp;
  endAt: Timestamp;
  city: string;
  state: string;
  address: string;
  mapUrl?: string;
  capacity: number;
  coverUrl: string;
  description: string;
  agendaItems: AgendaItem[];
  contact: ContactInfo;
  status: 'draft' | 'published' | 'ended';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CertificateConfig {
  enabled: boolean;
  attendanceMode: 'STRICT' | 'EOD' | 'SIMPLE';
  title: string;
  bodyTemplate: string;
  workloadHours?: string;
  signatureName?: string;
  signatureImageUrl?: string;
  backgroundImageUrl?: string;
  updatedAt: Timestamp;
}

export interface Order {
  id: string;
  userId: string;
  eventId: string;
  total: number;
  status: 'pending' | 'paid' | 'cancelled' | 'refunded';
  paymentMethod: 'manual' | 'pix_externo';
  createdAt: Timestamp;
}

export interface Ticket {
  id: string;
  eventId: string;
  orderId: string;
  userId: string;
  userName: string;
  qrCode: string;
  status: 'ativo' | 'usado' | 'cancelado';
  checkedInAt: Timestamp | null;
  checkedOutAt: Timestamp | null;
  createdAt: Timestamp;
}

export interface Certificate {
  id: string;
  eventId: string;
  userId: string;
  ticketId: string;
  nomeParticipante: string;
  tituloEvento: string;
  dataEmissao: Timestamp;
  urlPdf?: string;
}
