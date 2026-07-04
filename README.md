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

## Estrutura

```
src/
├── app/         # bootstrap, rotas, shell (sidebar + topbar)
├── core/        # banco de dados (schema, worker, client) e estado global (tema, sidebar)
├── features/    # um módulo por domínio financeiro (dashboard, lançamentos, cartões...)
├── shared/      # UI, utilitários de domínio (parcelamento, recorrência)
└── scripts/     # importação da planilha real (Controle_Mensal_Financeiro.xlsx)
```
