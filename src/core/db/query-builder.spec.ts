import { SupabaseDb, and, or, eq, gte, lt, isNull, isNotNull, like, desc } from './query-builder';
import { defineTable } from './schema/table';

interface Item {
  id: string;
  nomeCompleto: string;
  ativo: boolean;
}

const item = defineTable<Item>('item', { id: 'id', nomeCompleto: 'nome_completo', ativo: 'ativo' });

function fakeClient(resultRows: Record<string, unknown>[] = []) {
  const calls: unknown[][] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: any = {
    select: (cols: string) => (calls.push(['select', cols]), builder),
    eq: (c: string, v: unknown) => (calls.push(['eq', c, v]), builder),
    gte: (c: string, v: unknown) => (calls.push(['gte', c, v]), builder),
    lt: (c: string, v: unknown) => (calls.push(['lt', c, v]), builder),
    is: (c: string, v: unknown) => (calls.push(['is', c, v]), builder),
    not: (c: string, op: string, v: unknown) => (calls.push(['not', c, op, v]), builder),
    ilike: (c: string, p: string) => (calls.push(['ilike', c, p]), builder),
    or: (expr: string) => (calls.push(['or', expr]), builder),
    order: (c: string, opts: unknown) => (calls.push(['order', c, opts]), builder),
    limit: (n: number) => (calls.push(['limit', n]), builder),
    insert: (payload: unknown) => (calls.push(['insert', payload]), builder),
    update: (payload: unknown) => (calls.push(['update', payload]), builder),
    delete: () => (calls.push(['delete']), builder),
    then: (resolve: (v: { data: unknown; error: null }) => void) => resolve({ data: resultRows, error: null }),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client: any = { from: (table: string) => (calls.push(['from', table]), builder) };
  return { client, calls };
}

describe('SupabaseDb (query-builder)', () => {
  it('select().from().where(eq/and) traduz para .eq() encadeado e remapeia snake_case -> camelCase', async () => {
    const { client, calls } = fakeClient([{ id: '1', nome_completo: 'Ana', ativo: true }]);
    const db = new SupabaseDb(client);

    const rows = await db
      .select()
      .from(item)
      .where(and(eq(item.ativo, true), gte(item.id, '0')));

    expect(rows).toEqual([{ id: '1', nomeCompleto: 'Ana', ativo: true }]);
    expect(calls).toContain(['from', 'item']);
    expect(calls).toContain(['eq', 'ativo', true]);
    expect(calls).toContain(['gte', 'id', '0']);
  });

  it('orderBy(desc(...)) e limit() viram .order(desc) e .limit()', async () => {
    const { client, calls } = fakeClient([]);
    const db = new SupabaseDb(client);

    await db.select().from(item).orderBy(desc(item.nomeCompleto)).limit(5);

    expect(calls).toContain(['order', 'nome_completo', { ascending: false }]);
    expect(calls).toContain(['limit', 5]);
  });

  it('lt/isNull/isNotNull/like traduzem para lt/is/not-is/ilike', async () => {
    const { client, calls } = fakeClient([]);
    const db = new SupabaseDb(client);

    await db.select().from(item).where(lt(item.id, '9'));
    await db.select().from(item).where(isNull(item.nomeCompleto));
    await db.select().from(item).where(isNotNull(item.nomeCompleto));
    await db.select().from(item).where(like(item.nomeCompleto, '%ana%'));

    expect(calls).toContain(['lt', 'id', '9']);
    expect(calls).toContain(['is', 'nome_completo', null]);
    expect(calls).toContain(['not', 'nome_completo', 'is', null]);
    expect(calls).toContain(['ilike', 'nome_completo', '%ana%']);
  });

  it('or(...) vira uma única chamada .or() com sintaxe column.op.value separada por vírgula', async () => {
    const { client, calls } = fakeClient([]);
    const db = new SupabaseDb(client);

    await db.select().from(item).where(or(like(item.nomeCompleto, '%a%'), eq(item.ativo, true)));

    const orCall = calls.find((c) => c[0] === 'or') as [string, string];
    expect(orCall[1]).toBe('nome_completo.ilike."%a%",ativo.eq."true"');
  });

  it('select({campo: coluna}) remapeia o nome de saída em vez do nome da tabela', async () => {
    const { client } = fakeClient([{ nome_completo: 'Ana' }]);
    const db = new SupabaseDb(client);

    const rows = (await db.select({ nome: item.nomeCompleto }).from(item)) as unknown as { nome: string }[];
    expect(rows).toEqual([{ nome: 'Ana' }]);
  });

  it('insert().values() converte camelCase -> snake_case e ignora chaves undefined', async () => {
    const { client, calls } = fakeClient([]);
    const db = new SupabaseDb(client);

    await db.insert(item).values({ id: '1', nomeCompleto: 'Ana', ativo: undefined });

    const insertCall = calls.find((c) => c[0] === 'insert') as [string, Record<string, unknown>[]];
    expect(insertCall[1]).toEqual([{ id: '1', nome_completo: 'Ana' }]);
  });

  it('update().set().where() converte o payload e aplica a condição', async () => {
    const { client, calls } = fakeClient([]);
    const db = new SupabaseDb(client);

    await db.update(item).set({ nomeCompleto: 'Bia' }).where(eq(item.id, '1'));

    expect(calls).toContain(['update', { nome_completo: 'Bia' }]);
    expect(calls).toContain(['eq', 'id', '1']);
  });

  it('delete(tabela) sem where() apaga tudo usando um filtro seguro (id não nulo)', async () => {
    const { client, calls } = fakeClient([]);
    const db = new SupabaseDb(client);

    await db.delete(item);

    expect(calls).toContain(['delete']);
    expect(calls).toContain(['not', 'id', 'is', null]);
  });

  it('delete(tabela).where() aplica a condição em vez do filtro "apaga tudo"', async () => {
    const { client, calls } = fakeClient([]);
    const db = new SupabaseDb(client);

    await db.delete(item).where(eq(item.id, '1'));

    expect(calls).toContain(['delete']);
    expect(calls).toContain(['eq', 'id', '1']);
    expect(calls).not.toContain(['not', 'id', 'is', null]);
  });

  it('subscribeTable não derruba a tela quando o Supabase ainda não está configurado', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clienteFantasma = new Proxy(
      {},
      {
        get() {
          throw new Error('Supabase não configurado');
        },
      },
    ) as any;
    const db = new SupabaseDb(clienteFantasma);

    expect(() => db.subscribeTable(item, () => {})).not.toThrow();
  });
});
