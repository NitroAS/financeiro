// Copia o binário do SQLite-WASM para public/, de onde o worker o carrega em runtime.
// Roda automaticamente no postinstall para nunca ficar dessincronizado da versão do pacote.
import { copyFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = join(root, 'node_modules', 'wa-sqlite', 'dist', 'wa-sqlite.wasm');
const destDir = join(root, 'public', 'wa-sqlite');

mkdirSync(destDir, { recursive: true });
copyFileSync(src, join(destDir, 'wa-sqlite.wasm'));
console.log('wa-sqlite.wasm copiado para public/wa-sqlite/');
