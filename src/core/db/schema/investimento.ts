import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { responsavel } from './responsavel';

export const investimento = sqliteTable('investimento', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  nome: text('nome').notNull(),
  tipo: text('tipo', { enum: ['CDB', 'Tesouro', 'ETF', 'Acao', 'Fundo', 'Cripto'] }).notNull(),
  instituicao: text('instituicao'),
  responsavelId: text('responsavel_id').references(() => responsavel.id),
});
