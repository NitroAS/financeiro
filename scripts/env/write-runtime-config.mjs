#!/usr/bin/env node
// Grava SUPABASE_URL/SUPABASE_ANON_KEY (variáveis de ambiente do build, ex.: configuradas na
// Vercel) num arquivo TS gerado que o app importa em tempo de execução. Não vai pro Git (é
// regerado a cada build) — assim a chave nunca fica commitada, só existe no ambiente de build.
//
// Uso local: crie um arquivo `.env` na raiz do projeto com:
//   SUPABASE_URL=https://xxxxx.supabase.co
//   SUPABASE_ANON_KEY=eyJ...
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const envFile = join(root, '.env');

function carregarDotEnv() {
  if (!existsSync(envFile)) return;
  const conteudo = readFileSync(envFile, 'utf-8');
  for (const linha of conteudo.split('\n')) {
    const l = linha.trim();
    if (!l || l.startsWith('#')) continue;
    const idx = l.indexOf('=');
    if (idx === -1) continue;
    const chave = l.slice(0, idx).trim();
    const valor = l.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    if (!(chave in process.env)) process.env[chave] = valor;
  }
}

carregarDotEnv();

const supabaseUrl = process.env.SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? '';

const outDir = join(root, 'src', 'core', 'config');
const outFile = join(outDir, 'runtime-config.generated.ts');

mkdirSync(outDir, { recursive: true });
writeFileSync(
  outFile,
  `// Arquivo gerado por scripts/env/write-runtime-config.mjs a partir das variáveis de\n` +
    `// ambiente SUPABASE_URL/SUPABASE_ANON_KEY — não editar manualmente, não vai pro Git.\n` +
    `export const SUPABASE_URL = ${JSON.stringify(supabaseUrl)};\n` +
    `export const SUPABASE_ANON_KEY = ${JSON.stringify(supabaseAnonKey)};\n`,
);

console.log(
  supabaseUrl
    ? 'runtime-config.generated.ts gerado com as credenciais do Supabase.'
    : 'runtime-config.generated.ts gerado SEM credenciais (SUPABASE_URL/SUPABASE_ANON_KEY não definidas) — o app vai mostrar erro de configuração ao abrir.',
);
