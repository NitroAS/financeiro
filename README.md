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

O app não guarda nem processa sua planilha — o parser roda localmente no seu computador e gera
um arquivo de backup que você restaura pela própria interface:

```bash
node scripts/import-planilha/run.mjs /caminho/para/sua-planilha.xlsx financeiro-import.json
```

Depois, abra o app → ícone de upload no topo → selecione o `financeiro-import.json` gerado.
O parser espera o formato "Contas Rotativas / Contas Fixas" por pessoa/mês (ver
`scripts/import-planilha/parseMes.mjs`); ajuste `categorizar.mjs` se suas categorias forem diferentes.

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
