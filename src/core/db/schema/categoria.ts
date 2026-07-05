import { defineTable } from './table';

export interface Categoria {
  id: string;
  nome: string;
  tipo: 'receita' | 'despesa';
  cor: string;
  icone: string;
  categoriaPaiId: string | null;
}

export type NovaCategoria = Partial<Pick<Categoria, 'id' | 'categoriaPaiId'>> &
  Pick<Categoria, 'nome' | 'tipo' | 'cor' | 'icone'>;

export const categoria = defineTable<Categoria, NovaCategoria>('categoria', {
  id: 'id',
  nome: 'nome',
  tipo: 'tipo',
  cor: 'cor',
  icone: 'icone',
  categoriaPaiId: 'categoria_pai_id',
});
