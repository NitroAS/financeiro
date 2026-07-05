import { defineTable } from './table';

export interface Cartao {
  id: string;
  nome: string;
  banco: string;
  bandeira: string;
  limite: number;
  diaFechamento: number;
  diaVencimento: number;
  contaPagamentoId: string | null;
  responsavelId: string | null;
  cor: string;
  icone: string;
}

export type NovoCartao = Partial<Pick<Cartao, 'id' | 'contaPagamentoId' | 'responsavelId'>> &
  Pick<Cartao, 'nome' | 'banco' | 'bandeira' | 'limite' | 'diaFechamento' | 'diaVencimento' | 'cor' | 'icone'>;

export const cartao = defineTable<Cartao, NovoCartao>('cartao', {
  id: 'id',
  nome: 'nome',
  banco: 'banco',
  bandeira: 'bandeira',
  limite: 'limite',
  diaFechamento: 'dia_fechamento',
  diaVencimento: 'dia_vencimento',
  contaPagamentoId: 'conta_pagamento_id',
  responsavelId: 'responsavel_id',
  cor: 'cor',
  icone: 'icone',
});
