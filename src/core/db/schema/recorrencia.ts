import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const recorrencia = sqliteTable('recorrencia', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  frequencia: text('frequencia', { enum: ['mensal', 'semanal', 'anual'] }).notNull(),
  diaReferencia: integer('dia_referencia').notNull(),
  ativa: integer('ativa', { mode: 'boolean' }).notNull().default(true),
});
