import { defineTable } from './table';

export interface Orcamento {
  id: string;
  categoriaId: string;
  mes: number;
  ano: number;
  valorPlanejado: number;
}

export type NovoOrcamento = Partial<Pick<Orcamento, 'id'>> & Pick<Orcamento, 'categoriaId' | 'mes' | 'ano' | 'valorPlanejado'>;

export const orcamento = defineTable<Orcamento, NovoOrcamento>('orcamento', {
  id: 'id',
  categoriaId: 'categoria_id',
  mes: 'mes',
  ano: 'ano',
  valorPlanejado: 'valor_planejado',
});
