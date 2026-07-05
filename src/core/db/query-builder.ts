// Substitui os operadores/executor do drizzle-orm. O Supabase fala com o Postgres via
// PostgREST (API HTTP) — não aceita SQL bruto vindo do navegador, então não dá pra usar o
// compilador de SQL do Drizzle aqui. Este módulo reimplementa só o pedacinho da API do
// Drizzle que o app realmente usa (eq/and/or/gte/lt/isNull/isNotNull/like/desc + o encadeamento
// select/insert/update/delete), traduzindo cada chamada para o cliente supabase-js.
//
// Uma peça importante: o Postgres guarda colunas em snake_case (dia_fechamento), mas o app
// inteiro (templates, services) lê/escreve em camelCase (diaFechamento) — assim como o Drizzle
// fazia esse de-para sozinho. `rowFromDb`/`rowToDb` replicam essa conversão aqui.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ColumnRef } from './schema/table';

/** Tipagem mínima aceita pelo shim — qualquer TableDef real tem bem mais que isso, mas o
 * executor só precisa saber o nome real da tabela; as colunas são lidas via Object.entries
 * em tempo de execução (por isso a checagem estrutural fica solta aqui de propósito). */
export interface AnyTable {
  readonly _tableName: string;
}

type InferSelect<T> = T extends { readonly $inferSelect: infer R } ? R : Record<string, unknown>;

function columnEntries(table: AnyTable): [string, ColumnRef][] {
  return Object.entries(table).filter(([k]) => k !== '_tableName') as [string, ColumnRef][];
}

type Cond =
  | { kind: 'eq'; column: ColumnRef; value: unknown }
  | { kind: 'gte'; column: ColumnRef; value: unknown }
  | { kind: 'lt'; column: ColumnRef; value: unknown }
  | { kind: 'isNull'; column: ColumnRef }
  | { kind: 'isNotNull'; column: ColumnRef }
  | { kind: 'like'; column: ColumnRef; pattern: string }
  | { kind: 'and'; conditions: Cond[] }
  | { kind: 'or'; conditions: Cond[] };

export function eq(column: ColumnRef, value: unknown): Cond {
  return { kind: 'eq', column, value };
}
export function gte(column: ColumnRef, value: unknown): Cond {
  return { kind: 'gte', column, value };
}
export function lt(column: ColumnRef, value: unknown): Cond {
  return { kind: 'lt', column, value };
}
export function isNull(column: ColumnRef): Cond {
  return { kind: 'isNull', column };
}
export function isNotNull(column: ColumnRef): Cond {
  return { kind: 'isNotNull', column };
}
export function like(column: ColumnRef, pattern: string): Cond {
  return { kind: 'like', column, pattern };
}
export function and(...conditions: Cond[]): Cond {
  return { kind: 'and', conditions };
}
export function or(...conditions: Cond[]): Cond {
  return { kind: 'or', conditions };
}

export interface DescRef {
  readonly column: ColumnRef;
  readonly desc: true;
}
export function desc(column: ColumnRef): DescRef {
  return { column, desc: true };
}
type OrderArg = ColumnRef | DescRef;

function rowToDb(table: AnyTable, row: Record<string, unknown>): Record<string, unknown> {
  const byProp = new Map(columnEntries(table));
  const out: Record<string, unknown> = {};
  for (const [prop, value] of Object.entries(row)) {
    if (value === undefined) continue; // como o Drizzle: chave ausente do payload, não vira NULL
    const col = byProp.get(prop);
    if (col) out[col.name] = value;
  }
  return out;
}

function rowFromDb<Row>(table: AnyTable, row: Record<string, unknown>): Row {
  const out: Record<string, unknown> = {};
  for (const [prop, col] of columnEntries(table)) {
    if (col.name in row) out[prop] = row[col.name];
  }
  return out as Row;
}

function escapeOrValue(value: unknown): string {
  return `"${String(value).replace(/"/g, '\\"')}"`;
}

function condToOrExpr(cond: Cond): string {
  switch (cond.kind) {
    case 'eq':
      return `${cond.column.name}.eq.${escapeOrValue(cond.value)}`;
    case 'gte':
      return `${cond.column.name}.gte.${escapeOrValue(cond.value)}`;
    case 'lt':
      return `${cond.column.name}.lt.${escapeOrValue(cond.value)}`;
    case 'isNull':
      return `${cond.column.name}.is.null`;
    case 'isNotNull':
      return `${cond.column.name}.not.is.null`;
    case 'like':
      return `${cond.column.name}.ilike.${escapeOrValue(cond.pattern)}`;
    default:
      throw new Error('or() só suporta condições simples (eq/gte/lt/isNull/isNotNull/like)');
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyCondition(query: any, cond: Cond): any {
  switch (cond.kind) {
    case 'eq':
      return query.eq(cond.column.name, cond.value);
    case 'gte':
      return query.gte(cond.column.name, cond.value);
    case 'lt':
      return query.lt(cond.column.name, cond.value);
    case 'isNull':
      return query.is(cond.column.name, null);
    case 'isNotNull':
      return query.not(cond.column.name, 'is', null);
    case 'like':
      return query.ilike(cond.column.name, cond.pattern);
    case 'and':
      return cond.conditions.reduce((q, c) => applyCondition(q, c), query);
    case 'or':
      return query.or(cond.conditions.map(condToOrExpr).join(','));
  }
}

class SelectQuery<Row> implements PromiseLike<Row[]> {
  private table?: AnyTable;
  private condition?: Cond;
  private orderArg?: OrderArg;
  private limitN?: number;

  constructor(
    private readonly client: SupabaseClient,
    private readonly fields?: Record<string, ColumnRef>,
  ) {}

  from<T extends AnyTable>(table: T): SelectQuery<InferSelect<T>> {
    this.table = table;
    return this as unknown as SelectQuery<InferSelect<T>>;
  }

  where(cond: Cond): this {
    this.condition = cond;
    return this;
  }

  orderBy(arg: OrderArg): this {
    this.orderArg = arg;
    return this;
  }

  limit(n: number): this {
    this.limitN = n;
    return this;
  }

  then<TResult1 = Row[], TResult2 = never>(
    onfulfilled?: ((value: Row[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<Row[]> {
    if (!this.table) throw new Error('select().from(tabela) não foi chamado');
    const table = this.table;
    const selectCols = this.fields ? Object.values(this.fields).map((c) => c.name).join(',') : '*';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = this.client.from(table._tableName).select(selectCols);
    if (this.condition) query = applyCondition(query, this.condition);
    if (this.orderArg) {
      const isDesc = 'desc' in this.orderArg;
      const col = isDesc ? (this.orderArg as DescRef).column : (this.orderArg as ColumnRef);
      query = query.order(col.name, { ascending: !isDesc });
    }
    if (this.limitN !== undefined) query = query.limit(this.limitN);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Record<string, unknown>[];

    if (this.fields) {
      const reverseMap = new Map(Object.entries(this.fields).map(([outKey, col]) => [col.name, outKey]));
      return rows.map((row) => {
        const out: Record<string, unknown> = {};
        for (const [dbCol, val] of Object.entries(row)) {
          const outKey = reverseMap.get(dbCol);
          if (outKey) out[outKey] = val;
        }
        return out as Row;
      });
    }
    return rows.map((row) => rowFromDb<Row>(table, row));
  }
}

class DeleteQuery implements PromiseLike<void> {
  private condition?: Cond;

  constructor(
    private readonly client: SupabaseClient,
    private readonly table: AnyTable,
  ) {}

  where(cond: Cond): this {
    this.condition = cond;
    return this;
  }

  then<TResult1 = void, TResult2 = never>(
    onfulfilled?: ((value: void) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = this.client.from(this.table._tableName).delete();
    query = this.condition ? applyCondition(query, this.condition) : query.not('id', 'is', null);
    const { error } = await query;
    if (error) throw new Error(error.message);
  }
}

class UpdateQuery implements PromiseLike<void> {
  private condition?: Cond;
  private values?: Record<string, unknown>;

  constructor(
    private readonly client: SupabaseClient,
    private readonly table: AnyTable,
  ) {}

  set(values: Record<string, unknown>): this {
    this.values = values;
    return this;
  }

  where(cond: Cond): this {
    this.condition = cond;
    return this;
  }

  then<TResult1 = void, TResult2 = never>(
    onfulfilled?: ((value: void) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<void> {
    if (!this.values) throw new Error('update(tabela).set(valores) não foi chamado');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = this.client.from(this.table._tableName).update(rowToDb(this.table, this.values));
    if (this.condition) query = applyCondition(query, this.condition);
    const { error } = await query;
    if (error) throw new Error(error.message);
  }
}

export class SupabaseDb {
  constructor(private readonly client: SupabaseClient) {}

  select<Row = Record<string, unknown>>(fields?: Record<string, ColumnRef>): SelectQuery<Row> {
    return new SelectQuery<Row>(this.client, fields);
  }

  insert(table: AnyTable): { values: (rows: Record<string, unknown> | Record<string, unknown>[]) => Promise<void> } {
    return {
      values: async (rows) => {
        const arr = Array.isArray(rows) ? rows : [rows];
        const payload = arr.map((r) => rowToDb(table, r));
        const { error } = await this.client.from(table._tableName).insert(payload);
        if (error) throw new Error(error.message);
      },
    };
  }

  update(table: AnyTable): UpdateQuery {
    return new UpdateQuery(this.client, table);
  }

  delete(table: AnyTable): DeleteQuery {
    return new DeleteQuery(this.client, table);
  }

  /** Chama `onChange` sempre que alguém (neste ou em outro aparelho) alterar essa tabela —
   * é isso que faz o app atualizar quase em tempo real sem precisar recarregar a página.
   * Se o Supabase ainda não estiver configurado, simplesmente não faz nada (em vez de quebrar
   * a tela inteira) — o erro de configuração já aparece via DbService.error(). */
  subscribeTable(table: AnyTable, onChange: () => void): () => void {
    try {
      const tableName = table._tableName;
      const channel = this.client
        .channel(`changes-${tableName}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, onChange)
        .subscribe();
      return () => void this.client.removeChannel(channel);
    } catch {
      return () => {};
    }
  }
}
