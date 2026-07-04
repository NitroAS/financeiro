/// <reference lib="webworker" />
import * as Comlink from 'comlink';
import SQLiteESMFactory from 'wa-sqlite/dist/wa-sqlite.mjs';
import * as SQLite from 'wa-sqlite';
import { AccessHandlePoolVFS } from 'wa-sqlite/src/examples/AccessHandlePoolVFS.js';
import { SCHEMA_SQL } from './generated/schema.sql';

export type ProxyMethod = 'run' | 'all' | 'values' | 'get';

export interface ProxyResult {
  rows: unknown[];
}

let sqlite3: SQLiteAPI;
let db: number;

async function init(): Promise<void> {
  if (db) return;

  const module = await SQLiteESMFactory({
    locateFile: (file: string) => `/wa-sqlite/${file}`,
  });
  sqlite3 = SQLite.Factory(module);

  const vfs = new AccessHandlePoolVFS('/financeiro') as SQLiteVFS & {
    readonly name: string;
    isReady: Promise<void>;
  };
  await vfs.isReady;
  sqlite3.vfs_register(vfs, true);

  db = await sqlite3.open_v2('financeiro.db', undefined, vfs.name);

  const { rows } = await sqlite3.execWithParams(
    db,
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'responsavel'`,
  );
  if (rows.length === 0) {
    for (const statement of SCHEMA_SQL.split('--> statement-breakpoint')) {
      const trimmed = statement.trim();
      if (trimmed) await sqlite3.run(db, trimmed);
    }
  }
}

async function query(sql: string, params: SQLiteCompatibleType[], method: ProxyMethod): Promise<ProxyResult> {
  await init();
  const { rows } = await sqlite3.execWithParams(db, sql, params);
  if (method === 'get') {
    return { rows: rows[0] ?? [] };
  }
  return { rows };
}

const api = { init, query };
export type SqliteWorkerApi = typeof api;

Comlink.expose(api);
