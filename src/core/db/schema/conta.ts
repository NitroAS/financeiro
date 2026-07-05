import { defineTable } from './table';

export interface Conta {
  id: string;
  nome: string;
  tipo: 'corrente' | 'carteira' | 'dinheiro' | 'investimento';
  instituicao: string | null;
  saldoInicial: number;
  cor: string;
  icone: string;
  responsavelId: string | null;
  arquivada: boolean;
}

export type NovaConta = Partial<Pick<Conta, 'id' | 'instituicao' | 'responsavelId' | 'arquivada' | 'saldoInicial'>> &
  Pick<Conta, 'nome' | 'tipo' | 'cor' | 'icone'>;

export const conta = defineTable<Conta, NovaConta>('conta', {
  id: 'id',
  nome: 'nome',
  tipo: 'tipo',
  instituicao: 'instituicao',
  saldoInicial: 'saldo_inicial',
  cor: 'cor',
  icone: 'icone',
  responsavelId: 'responsavel_id',
  arquivada: 'arquivada',
});
