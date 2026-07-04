import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { conta } from './conta';
import { responsavel } from './responsavel';

export const cartao = sqliteTable('cartao', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  nome: text('nome').notNull(),
  banco: text('banco').notNull(),
  bandeira: text('bandeira').notNull(),
  limite: real('limite').notNull(),
  diaFechamento: integer('dia_fechamento').notNull(),
  diaVencimento: integer('dia_vencimento').notNull(),
  contaPagamentoId: text('conta_pagamento_id').references(() => conta.id),
  responsavelId: text('responsavel_id').references(() => responsavel.id),
  cor: text('cor').notNull(),
  icone: text('icone').notNull(),
});
