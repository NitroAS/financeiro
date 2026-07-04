// Concatena as migrations geradas pelo drizzle-kit (na ordem do journal) num único
// módulo TS com a string de bootstrap do schema, para o worker do SQLite-WASM
// importar direto (sem fetch em runtime, sem depender de path de assets).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(root, '..', '..', 'src', 'core', 'db', 'migrations');
const outDir = join(root, '..', '..', 'src', 'core', 'db', 'generated');
const outFile = join(outDir, 'schema.sql.ts');

const journal = JSON.parse(readFileSync(join(migrationsDir, 'meta', '_journal.json'), 'utf-8'));

const sql = journal.entries
  .sort((a, b) => a.idx - b.idx)
  .map((entry) => readFileSync(join(migrationsDir, `${entry.tag}.sql`), 'utf-8'))
  .join('\n');

mkdirSync(outDir, { recursive: true });
writeFileSync(
  outFile,
  `// Arquivo gerado por scripts/db/build-schema-sql.mjs — não editar manualmente.\n` +
    `// Rode \`npm run db:generate\` após alterar o schema em core/db/schema.\n` +
    `export const SCHEMA_SQL = ${JSON.stringify(sql)};\n`,
);

console.log(`schema.sql.ts gerado a partir de ${journal.entries.length} migration(s).`);
