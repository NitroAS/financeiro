import { blob, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { lancamento } from './lancamento';

export const anexo = sqliteTable('anexo', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  lancamentoId: text('lancamento_id')
    .notNull()
    .references(() => lancamento.id),
  nomeArquivo: text('nome_arquivo').notNull(),
  mime: text('mime').notNull(),
  conteudo: blob('conteudo', { mode: 'buffer' }).notNull(),
});
