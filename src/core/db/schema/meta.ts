import { defineTable } from './table';

export interface Meta {
  id: string;
  nome: string;
  valorAlvo: number;
  valorAtual: number;
  dataAlvo: string | null;
  cor: string;
  icone: string;
  contaVinculadaId: string | null;
}

export type NovaMeta = Partial<Pick<Meta, 'id' | 'valorAtual' | 'dataAlvo' | 'contaVinculadaId'>> &
  Pick<Meta, 'nome' | 'valorAlvo' | 'cor' | 'icone'>;

export const meta = defineTable<Meta, NovaMeta>('meta', {
  id: 'id',
  nome: 'nome',
  valorAlvo: 'valor_alvo',
  valorAtual: 'valor_atual',
  dataAlvo: 'data_alvo',
  cor: 'cor',
  icone: 'icone',
  contaVinculadaId: 'conta_vinculada_id',
});
