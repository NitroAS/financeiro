import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const filtroSalvo = sqliteTable('filtro_salvo', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  nome: text('nome').notNull(),
  escopo: text('escopo').notNull(),
  parametrosJson: text('parametros_json').notNull(),
});
