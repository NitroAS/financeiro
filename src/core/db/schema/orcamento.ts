import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { categoria } from './categoria';

export const orcamento = sqliteTable('orcamento', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  categoriaId: text('categoria_id')
    .notNull()
    .references(() => categoria.id),
  mes: integer('mes').notNull(),
  ano: integer('ano').notNull(),
  valorPlanejado: real('valor_planejado').notNull(),
});
