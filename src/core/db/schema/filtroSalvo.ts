import { defineTable } from './table';

export interface FiltroSalvo {
  id: string;
  nome: string;
  escopo: string;
  parametrosJson: string;
}

export type NovoFiltroSalvo = Partial<Pick<FiltroSalvo, 'id'>> & Pick<FiltroSalvo, 'nome' | 'escopo' | 'parametrosJson'>;

export const filtroSalvo = defineTable<FiltroSalvo, NovoFiltroSalvo>('filtro_salvo', {
  id: 'id',
  nome: 'nome',
  escopo: 'escopo',
  parametrosJson: 'parametros_json',
});
