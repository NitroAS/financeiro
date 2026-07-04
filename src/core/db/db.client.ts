import * as Comlink from 'comlink';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import * as schema from './schema';
import type { SqliteWorkerApi } from './sqlite.worker';

let workerApi: Comlink.Remote<SqliteWorkerApi> | undefined;
let readyPromise: Promise<void> | undefined;

function getWorkerApi(): Comlink.Remote<SqliteWorkerApi> {
  if (!workerApi) {
    const worker = new Worker(new URL('./sqlite.worker', import.meta.url), { type: 'module' });
    workerApi = Comlink.wrap<SqliteWorkerApi>(worker);
  }
  return workerApi;
}

/** Garante que o worker terminou de abrir/migrar o banco antes da primeira query. */
export function ready(): Promise<void> {
  readyPromise ??= getWorkerApi().init();
  return readyPromise;
}

export const db = drizzle(async (sql, params, method) => {
  await ready();
  return getWorkerApi().query(sql, params, method);
}, { schema });
