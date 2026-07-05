import { defineTable } from './table';

export interface Anexo {
  id: string;
  lancamentoId: string;
  nomeArquivo: string;
  mime: string;
  conteudo: string;
}

export type NovoAnexo = Partial<Pick<Anexo, 'id'>> & Pick<Anexo, 'lancamentoId' | 'nomeArquivo' | 'mime' | 'conteudo'>;

export const anexo = defineTable<Anexo, NovoAnexo>('anexo', {
  id: 'id',
  lancamentoId: 'lancamento_id',
  nomeArquivo: 'nome_arquivo',
  mime: 'mime',
  conteudo: 'conteudo',
});
