import { real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { investimento } from './investimento';

export const investimentoMovimento = sqliteTable('investimento_movimento', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  investimentoId: text('investimento_id')
    .notNull()
    .references(() => investimento.id),
  tipo: text('tipo', { enum: ['aporte', 'resgate', 'rendimento'] }).notNull(),
  valor: real('valor').notNull(),
  data: text('data').notNull(),
});
