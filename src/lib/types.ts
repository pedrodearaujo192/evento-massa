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

export interface Event {
  id: string;
  titulo: string;
  slug: string;
  categoria: 'Workshop' | 'Congresso' | 'Masterclass' | 'Lançamento';
  data: string;
  local: string;
  cidade: string;
  estado: string;
  preco: number;
  descricao: string;
  imagem_url: string;
  id_criador: string;
  criadoEm: Timestamp;
  status: 'ativo' | 'cancelado' | 'encerrado';
  capacidade: number;
  certificadoAtivo: boolean;
  cargaHoraria?: string;
}

export interface Order {
  id: string;
  userId: string;
  eventId: string;
  total: number;
  status: 'pendente' | 'pago' | 'cancelado';
  metodoPagamento: 'pix_externo' | 'manual';
  criadoEm: Timestamp;
}

export interface Ticket {
  id: string;
  eventId: string;
  orderId: string;
  userId: string;
  userName: string;
  qrCode: string; // Token único
  status: 'ativo' | 'usado' | 'cancelado';
  checkedInAt: Timestamp | null;
  checkedOutAt: Timestamp | null;
  criadoEm: Timestamp;
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
