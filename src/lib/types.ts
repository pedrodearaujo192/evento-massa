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
  categoria: 'Workshop' | 'Congresso' | 'Masterclass' | 'Lançamento';
  data: string; // Storing as ISO string e.g., "2026-04-20"
  local: string;
  preco: number;
  descricao: string;
  imagem_url: string;
  id_criador: string;
  criadoEm: Timestamp;
  status: 'ativo' | 'cancelado';
}

export interface Ticket {
  id: string;
  id_evento: string;
  nome_participante: string;
  documento: string;
  tipo_documento: 'cpf' | 'cnpj';
  email: string;
  telefone: string;
  qr_code: string;
  status: 'ativo' | 'usado' | 'cancelado';
  criadoPor: string; // UID of admin who created it
  criadoEm: Timestamp;
  checkinEm: Timestamp | null;
}
