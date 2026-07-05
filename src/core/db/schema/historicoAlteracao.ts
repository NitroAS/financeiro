import { defineTable } from './table';

export interface HistoricoAlteracao {
  id: string;
  lancamentoId: string;
  campo: string;
  valorAntigo: string | null;
  valorNovo: string | null;
  alteradoEm: string;
}

export type NovoHistoricoAlteracao = Partial<Pick<HistoricoAlteracao, 'id' | 'valorAntigo' | 'valorNovo' | 'alteradoEm'>> &
  Pick<HistoricoAlteracao, 'lancamentoId' | 'campo'>;

export const historicoAlteracao = defineTable<HistoricoAlteracao, NovoHistoricoAlteracao>('historico_alteracao', {
  id: 'id',
  lancamentoId: 'lancamento_id',
  campo: 'campo',
  valorAntigo: 'valor_antigo',
  valorNovo: 'valor_novo',
  alteradoEm: 'alterado_em',
});
