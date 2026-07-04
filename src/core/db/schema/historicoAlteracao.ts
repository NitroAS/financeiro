import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { lancamento } from './lancamento';

export const historicoAlteracao = sqliteTable('historico_alteracao', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  lancamentoId: text('lancamento_id')
    .notNull()
    .references(() => lancamento.id),
  campo: text('campo').notNull(),
  valorAntigo: text('valor_antigo'),
  valorNovo: text('valor_novo'),
  alteradoEm: text('alterado_em')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});
