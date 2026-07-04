import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const responsavel = sqliteTable('responsavel', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  nome: text('nome').notNull(),
  cor: text('cor').notNull(),
  icone: text('icone').notNull(),
});
