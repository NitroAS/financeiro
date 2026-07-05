import { defineTable } from './table';

export interface Responsavel {
  id: string;
  nome: string;
  cor: string;
  icone: string;
}

export type NovoResponsavel = Omit<Responsavel, 'id'> & { id?: string };

export const responsavel = defineTable<Responsavel, NovoResponsavel>('responsavel', {
  id: 'id',
  nome: 'nome',
  cor: 'cor',
  icone: 'icone',
});
