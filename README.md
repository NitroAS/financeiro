# Financeiro

Controle financeiro pessoal — Angular + Supabase (Postgres), sincronizado em quase tempo real entre
todos os aparelhos da família, atrás de um login único compartilhado.

Contexto completo (arquitetura, modelagem de dados, wireframes, cronograma): ver o blueprint aprovado no início do projeto.

## Stack

- Angular 18 (standalone components) + TypeScript
- TailwindCSS + primitivos próprios (`shared/ui`) no espírito shadcn/spartan
- Supabase (Postgres + Auth + Realtime) como banco compartilhado entre aparelhos
- Camada própria de query-builder (`src/core/db/query-builder.ts`) que imita a API do Drizzle
  (`eq/and/or/gte/lt/...`) mas fala com o Supabase via `@supabase/supabase-js` — o app inteiro lê e
  escreve em camelCase, a tradução para as colunas em snake_case do Postgres é automática
- lucide-angular para ícones

## Configuração (Supabase)

O app não funciona sem um projeto Supabase configurado. Passo a passo completo em
[`docs/supabase-setup.md`](docs/supabase-setup.md); resumo:

1. Crie um projeto grátis em [supabase.com](https://supabase.com).
2. Rode `supabase/schema.sql` inteiro no SQL Editor do projeto (cria as tabelas, ativa
   segurança por linha e tempo real, e semeia os responsáveis/categorias padrão).
3. Em **Authentication → Users**, crie um único usuário (e-mail + senha) compartilhado pela
   família — é o login que todo mundo vai usar.
4. Em **Project Settings → API**, copie a **Project URL** e a **anon public key**.
5. Defina como variáveis de ambiente `SUPABASE_URL` e `SUPABASE_ANON_KEY` (num arquivo `.env` na
   raiz para rodar local, ou nas envs do projeto na Vercel para produção).

Sem isso, o app mostra uma tela de "Supabase não configurado" em vez de quebrar.

## Desenvolvimento

```bash
npm install       # instala deps (também gera um runtime-config.generated.ts vazio)
npm start         # gera o runtime-config a partir do .env e roda ng serve — http://localhost:4200
npm run build     # idem, para build de produção
npm test          # testes unitários (Karma + ChromeHeadlessNoSandbox)
```

## Banco de dados

O schema (TypeScript, só descreve nomes de tabela/coluna — sem conexão real) fica em
`src/core/db/schema/*.ts`. O schema de verdade (DDL do Postgres) fica em `supabase/schema.sql` —
ao adicionar uma tabela/coluna nova, edite os dois: o `.ts` (pro app saber o nome da coluna) e o
`.sql` (pra criar de fato no Supabase; pode rodar de novo com segurança, é idempotente).

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

## PWA e offline

`ng add @angular/pwa` já está configurado (`ngsw-config.json`, `manifest.webmanifest`, ícones) —
o app é instalável no celular/desktop. O que já funciona offline: o app abre (assets em cache) e
as telas continuam mostrando os últimos dados carregados. **Ainda não implementado**: uma fila que
guarde alterações feitas offline e reenvie ao reconectar — hoje, sem internet, uma tentativa de
salvar simplesmente falha (o Supabase é acessado via HTTP, não tem cópia local do banco). Isso é
uma simplificação consciente dado o tamanho da migração para Supabase; se for importante ter
gravação 100% offline, é um próximo passo a implementar.

## Estrutura

```
src/
├── app/         # bootstrap, rotas, shell (sidebar + topbar + busca global)
├── core/        # auth (login compartilhado), banco (schema, client, query-builder, backup), estado global
├── features/    # um módulo por domínio financeiro (dashboard, lançamentos, cartões, metas...)
├── shared/      # UI, utilitários de domínio (parcelamento, recorrência, fatura, exportação)
└── scripts/     # importação da planilha real (Controle_Mensal_Financeiro.xlsx)
```
