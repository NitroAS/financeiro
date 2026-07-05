# Financeiro

Controle financeiro pessoal — Angular + SQLite (WASM/OPFS) + Drizzle ORM, 100% local e offline.

Contexto completo (arquitetura, modelagem de dados, wireframes, cronograma): ver o blueprint aprovado no início do projeto.

## Stack

- Angular 18 (standalone components) + TypeScript
- TailwindCSS + primitivos próprios (`shared/ui`) no espírito shadcn/spartan
- SQLite via `wa-sqlite` (WASM) + OPFS, rodando num Web Worker — banco real, arquivo único, 100% offline
- Drizzle ORM (`drizzle-orm/sqlite-proxy`) como camada de tipagem/queries sobre o worker
- lucide-angular para ícones

## Desenvolvimento

```bash
npm install       # instala deps e copia o wa-sqlite.wasm para public/ (postinstall)
npm start         # ng serve — http://localhost:4200
npm run build     # build de produção
npm test          # testes unitários (Karma + ChromeHeadlessNoSandbox)
```

## Banco de dados

O schema fica em `src/core/db/schema/*.ts` (Drizzle). Depois de alterar o schema:

```bash
npm run db:generate
```

Isso roda o `drizzle-kit generate` (gera a migration SQL em `src/core/db/migrations/`) e concatena
o resultado em `src/core/db/generated/schema.sql.ts`, que o worker (`sqlite.worker.ts`) importa
diretamente para bootstrapar o banco na primeira execução — sem fetch em runtime, sem depender de
path de assets.

## Importar uma planilha existente

**Direto pelo app**: ícone de planilha (📄) na topbar → escolha o `.xlsx` → pronto. Tudo roda no
navegador (o arquivo nunca sai do seu aparelho) e insere direto no banco. É idempotente: se você
importar a mesma planilha de novo (ou uma versão mais atualizada dela), os lançamentos já
importados antes não se repetem — só o que é novo entra.

A lógica de leitura fica em `src/shared/xlsx-import/` (parser + categorização) e
`src/features/importacao/importacao.service.ts` (grava no banco). O parser espera o formato
"Contas Rotativas / Contas Fixas" por pessoa/mês; ajuste `categorizar.ts` se suas categorias forem
diferentes.

**Via linha de comando** (gera um arquivo de backup para restaurar manualmente, útil para inspecionar
o resultado antes de trazer pro app):

```bash
node scripts/import-planilha/run.mjs /caminho/para/sua-planilha.xlsx financeiro-import.json
```

Depois, abra o app → ícone de upload (restaurar backup) no topo → selecione o
`financeiro-import.json` gerado. Essa versão é uma cópia equivalente do parser em Node
(`scripts/import-planilha/parseMes.mjs`) — mudanças em um devem ser espelhadas no outro.

## Backup e restauração

Os dois ícones ao lado do alternador de tema exportam/restauram um JSON com todas as tabelas do
banco — útil como backup manual ou para migrar de aparelho.

## PWA

`ng add @angular/pwa` já está configurado (`ngsw-config.json`, `manifest.webmanifest`, ícones).
Em produção (`npm run build`), o app é instalável e funciona offline após a primeira visita.

## Estrutura

```
src/
├── app/         # bootstrap, rotas, shell (sidebar + topbar + busca global)
├── core/        # banco de dados (schema, worker, client, backup) e estado global (tema, sidebar, busca)
├── features/    # um módulo por domínio financeiro (dashboard, lançamentos, cartões, metas...)
├── shared/      # UI, utilitários de domínio (parcelamento, recorrência, fatura, exportação)
└── scripts/     # importação da planilha real (Controle_Mensal_Financeiro.xlsx)
```
