
export interface OperationalRecord {
  id: string;
  nome: string;
  nomeRequerido: string;
  telefone: string;
  endereco: string;
  pontoReferencia: string;
  observacoes: string;
  createdAt: string;
  updatedAt?: string;
}

export interface StatusMessage {
  text: string;
  type: 'success' | 'error' | 'info';
}

export type FormData = Omit<OperationalRecord, 'id' | 'createdAt' | 'updatedAt'>;
