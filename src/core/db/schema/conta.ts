import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { responsavel } from './responsavel';

export const conta = sqliteTable('conta', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  nome: text('nome').notNull(),
  tipo: text('tipo', { enum: ['corrente', 'carteira', 'dinheiro', 'investimento'] }).notNull(),
  instituicao: text('instituicao'),
  saldoInicial: real('saldo_inicial').notNull().default(0),
  cor: text('cor').notNull(),
  icone: text('icone').notNull(),
  responsavelId: text('responsavel_id').references(() => responsavel.id),
  arquivada: integer('arquivada', { mode: 'boolean' }).notNull().default(false),
});
