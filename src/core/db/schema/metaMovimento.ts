import { real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { meta } from './meta';

export const metaMovimento = sqliteTable('meta_movimento', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  metaId: text('meta_id')
    .notNull()
    .references(() => meta.id),
  tipo: text('tipo', { enum: ['aporte', 'resgate'] }).notNull(),
  valor: real('valor').notNull(),
  data: text('data').notNull(),
});
