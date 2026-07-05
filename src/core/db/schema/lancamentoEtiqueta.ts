import { defineTable } from './table';

export interface LancamentoEtiqueta {
  lancamentoId: string;
  etiquetaId: string;
}

export const lancamentoEtiqueta = defineTable<LancamentoEtiqueta, LancamentoEtiqueta>('lancamento_etiqueta', {
  lancamentoId: 'lancamento_id',
  etiquetaId: 'etiqueta_id',
});
