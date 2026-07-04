import { primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { lancamento } from './lancamento';
import { etiqueta } from './etiqueta';

export const lancamentoEtiqueta = sqliteTable(
  'lancamento_etiqueta',
  {
    lancamentoId: text('lancamento_id')
      .notNull()
      .references(() => lancamento.id),
    etiquetaId: text('etiqueta_id')
      .notNull()
      .references(() => etiqueta.id),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.lancamentoId, t.etiquetaId] }),
  }),
);
