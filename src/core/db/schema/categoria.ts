import { type AnySQLiteColumn, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const categoria = sqliteTable('categoria', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  nome: text('nome').notNull(),
  tipo: text('tipo', { enum: ['receita', 'despesa'] }).notNull(),
  cor: text('cor').notNull(),
  icone: text('icone').notNull(),
  categoriaPaiId: text('categoria_pai_id').references((): AnySQLiteColumn => categoria.id),
});
