// Substitui o schema do Drizzle (sqlite-core) por descritores simples de tabela/coluna.
// Motivo: o app passou a falar com o Postgres do Supabase via API HTTP (PostgREST), que não
// aceita SQL bruto vindo do navegador — então não dá mais para usar o compilador de SQL do
// Drizzle. Em vez disso, esses descritores guardam só o nome real da tabela/coluna no Postgres
// e servem de "vocabulário" para o query-builder em ../query-builder.ts montar as chamadas do
// supabase-js. `$inferSelect`/`$inferInsert` são campos fantasma (nunca têm valor em tempo de
// execução) só para preservar `typeof tabela.$inferSelect` como já era usado em todo o app.
export interface ColumnRef {
  readonly table: string;
  readonly name: string;
}

export type TableColumns<Row> = { [K in keyof Row]-?: string };

export type TableDef<Row, Insert> = {
  readonly [K in keyof Row]: ColumnRef;
} & {
  readonly _tableName: string;
  readonly $inferSelect: Row;
  readonly $inferInsert: Insert;
};

export function defineTable<Row extends object, Insert extends object = Row>(
  tableName: string,
  columns: TableColumns<Row>,
): TableDef<Row, Insert> {
  const result: Record<string, unknown> = { _tableName: tableName };
  for (const key of Object.keys(columns)) {
    result[key] = { table: tableName, name: (columns as Record<string, string>)[key] };
  }
  return result as TableDef<Row, Insert>;
}
