import { defineTable } from './table';

export interface MetaMovimento {
  id: string;
  metaId: string;
  tipo: 'aporte' | 'resgate';
  valor: number;
  data: string;
}

export type NovaMetaMovimento = Partial<Pick<MetaMovimento, 'id'>> & Pick<MetaMovimento, 'metaId' | 'tipo' | 'valor' | 'data'>;

export const metaMovimento = defineTable<MetaMovimento, NovaMetaMovimento>('meta_movimento', {
  id: 'id',
  metaId: 'meta_id',
  tipo: 'tipo',
  valor: 'valor',
  data: 'data',
});
