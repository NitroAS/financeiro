import { defineTable } from './table';

export interface InvestimentoMovimento {
  id: string;
  investimentoId: string;
  tipo: 'aporte' | 'resgate' | 'rendimento';
  valor: number;
  data: string;
}

export type NovoInvestimentoMovimento = Partial<Pick<InvestimentoMovimento, 'id'>> &
  Pick<InvestimentoMovimento, 'investimentoId' | 'tipo' | 'valor' | 'data'>;

export const investimentoMovimento = defineTable<InvestimentoMovimento, NovoInvestimentoMovimento>('investimento_movimento', {
  id: 'id',
  investimentoId: 'investimento_id',
  tipo: 'tipo',
  valor: 'valor',
  data: 'data',
});
