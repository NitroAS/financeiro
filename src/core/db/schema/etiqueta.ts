import { defineTable } from './table';

export interface Etiqueta {
  id: string;
  nome: string;
  cor: string;
}

export type NovaEtiqueta = Partial<Pick<Etiqueta, 'id'>> & Pick<Etiqueta, 'nome' | 'cor'>;

export const etiqueta = defineTable<Etiqueta, NovaEtiqueta>('etiqueta', {
  id: 'id',
  nome: 'nome',
  cor: 'cor',
});
