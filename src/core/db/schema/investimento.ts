import { defineTable } from './table';

export interface Investimento {
  id: string;
  nome: string;
  tipo: 'CDB' | 'Tesouro' | 'ETF' | 'Acao' | 'Fundo' | 'Cripto';
  instituicao: string | null;
  responsavelId: string | null;
}

export type NovoInvestimento = Partial<Pick<Investimento, 'id' | 'instituicao' | 'responsavelId'>> &
  Pick<Investimento, 'nome' | 'tipo'>;

export const investimento = defineTable<Investimento, NovoInvestimento>('investimento', {
  id: 'id',
  nome: 'nome',
  tipo: 'tipo',
  instituicao: 'instituicao',
  responsavelId: 'responsavel_id',
});
