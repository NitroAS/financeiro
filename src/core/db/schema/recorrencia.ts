import { defineTable } from './table';

export interface Recorrencia {
  id: string;
  frequencia: 'mensal' | 'semanal' | 'anual';
  diaReferencia: number;
  ativa: boolean;
}

export type NovaRecorrencia = Partial<Pick<Recorrencia, 'id' | 'ativa'>> & Pick<Recorrencia, 'frequencia' | 'diaReferencia'>;

export const recorrencia = defineTable<Recorrencia, NovaRecorrencia>('recorrencia', {
  id: 'id',
  frequencia: 'frequencia',
  diaReferencia: 'dia_referencia',
  ativa: 'ativa',
});
