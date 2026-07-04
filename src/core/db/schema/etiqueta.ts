import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const etiqueta = sqliteTable('etiqueta', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  nome: text('nome').notNull(),
  cor: text('cor').notNull(),
});
