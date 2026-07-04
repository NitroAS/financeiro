import { real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { conta } from './conta';

export const meta = sqliteTable('meta', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  nome: text('nome').notNull(),
  valorAlvo: real('valor_alvo').notNull(),
  valorAtual: real('valor_atual').notNull().default(0),
  dataAlvo: text('data_alvo'),
  cor: text('cor').notNull(),
  icone: text('icone').notNull(),
  contaVinculadaId: text('conta_vinculada_id').references(() => conta.id),
});
