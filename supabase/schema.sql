-- Schema do app financeiro para Supabase (Postgres).
-- Rode este arquivo inteiro no SQL Editor do seu projeto Supabase (Database > SQL Editor >
-- New query, cola tudo, Run) logo depois de criar o projeto. Pode rodar de novo com segurança
-- graças aos "IF NOT EXISTS"/"ON CONFLICT DO NOTHING".

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tabelas (na ordem pais -> filhos, pra respeitar as chaves estrangeiras)
-- ---------------------------------------------------------------------------

create table if not exists responsavel (
  id text primary key default gen_random_uuid()::text,
  nome text not null,
  cor text not null,
  icone text not null
);

create table if not exists conta (
  id text primary key default gen_random_uuid()::text,
  nome text not null,
  tipo text not null check (tipo in ('corrente', 'carteira', 'dinheiro', 'investimento')),
  instituicao text,
  saldo_inicial double precision not null default 0,
  cor text not null,
  icone text not null,
  responsavel_id text references responsavel(id),
  arquivada boolean not null default false
);

create table if not exists cartao (
  id text primary key default gen_random_uuid()::text,
  nome text not null,
  banco text not null,
  bandeira text not null,
  limite double precision not null,
  dia_fechamento integer not null,
  dia_vencimento integer not null,
  conta_pagamento_id text references conta(id),
  responsavel_id text references responsavel(id),
  cor text not null,
  icone text not null
);

create table if not exists categoria (
  id text primary key default gen_random_uuid()::text,
  nome text not null,
  tipo text not null check (tipo in ('receita', 'despesa')),
  cor text not null,
  icone text not null,
  categoria_pai_id text references categoria(id)
);

create table if not exists etiqueta (
  id text primary key default gen_random_uuid()::text,
  nome text not null,
  cor text not null
);

create table if not exists recorrencia (
  id text primary key default gen_random_uuid()::text,
  frequencia text not null check (frequencia in ('mensal', 'semanal', 'anual')),
  dia_referencia integer not null,
  ativa boolean not null default true
);

create table if not exists lancamento (
  id text primary key default gen_random_uuid()::text,
  tipo text not null check (tipo in ('receita', 'despesa')),
  descricao text not null,
  valor double precision not null,
  data text not null,
  vencimento text,
  data_pagamento text,
  status text not null default 'pendente' check (status in ('pendente', 'pago', 'atrasado')),
  conta_id text references conta(id),
  cartao_id text references cartao(id),
  categoria_id text references categoria(id),
  responsavel_id text references responsavel(id),
  forma_pagamento text,
  observacao text,
  favorito boolean not null default false,
  deleted_at text,
  grupo_parcelamento_id text,
  parcela_atual integer,
  parcela_total integer,
  recorrencia_id text references recorrencia(id),
  origem_importacao text,
  criado_em text default (now()::text),
  atualizado_em text
);

create table if not exists lancamento_etiqueta (
  lancamento_id text not null references lancamento(id),
  etiqueta_id text not null references etiqueta(id),
  primary key (lancamento_id, etiqueta_id)
);

create table if not exists anexo (
  id text primary key default gen_random_uuid()::text,
  lancamento_id text not null references lancamento(id),
  nome_arquivo text not null,
  mime text not null,
  conteudo text not null
);

create table if not exists historico_alteracao (
  id text primary key default gen_random_uuid()::text,
  lancamento_id text not null references lancamento(id),
  campo text not null,
  valor_antigo text,
  valor_novo text,
  alterado_em text not null default (now()::text)
);

create table if not exists orcamento (
  id text primary key default gen_random_uuid()::text,
  categoria_id text not null references categoria(id),
  mes integer not null,
  ano integer not null,
  valor_planejado double precision not null
);

create table if not exists meta (
  id text primary key default gen_random_uuid()::text,
  nome text not null,
  valor_alvo double precision not null,
  valor_atual double precision not null default 0,
  data_alvo text,
  cor text not null,
  icone text not null,
  conta_vinculada_id text references conta(id)
);

create table if not exists meta_movimento (
  id text primary key default gen_random_uuid()::text,
  meta_id text not null references meta(id),
  tipo text not null check (tipo in ('aporte', 'resgate')),
  valor double precision not null,
  data text not null
);

create table if not exists investimento (
  id text primary key default gen_random_uuid()::text,
  nome text not null,
  tipo text not null check (tipo in ('CDB', 'Tesouro', 'ETF', 'Acao', 'Fundo', 'Cripto')),
  instituicao text,
  responsavel_id text references responsavel(id)
);

create table if not exists investimento_movimento (
  id text primary key default gen_random_uuid()::text,
  investimento_id text not null references investimento(id),
  tipo text not null check (tipo in ('aporte', 'resgate', 'rendimento')),
  valor double precision not null,
  data text not null
);

create table if not exists filtro_salvo (
  id text primary key default gen_random_uuid()::text,
  nome text not null,
  escopo text not null,
  parametros_json text not null
);

-- ---------------------------------------------------------------------------
-- Segurança: a chave pública (anon key) fica embutida no site publicado, então
-- qualquer um que a encontrar poderia ler/escrever direto no banco se não
-- houvesse trava nenhuma. Como o app não tem cadastro por pessoa (é o uso
-- combinado da família com um único login compartilhado, ou "Entrar com Google" travado a um
-- e-mail), a regra é: só o dono (o e-mail abaixo) pode ler ou escrever qualquer linha.
--
-- TROQUE o e-mail abaixo pelo seu antes de rodar (é o mesmo que você usa pra entrar no app).
-- Se já rodou este arquivo antes com "using (true)", pode rodar de novo com segurança — ele
-- substitui a política antiga pela nova.
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
  email_permitido text := 'alexsandrodevelop@gmail.com'; -- troque pelo seu e-mail
begin
  for t in select unnest(array[
    'responsavel', 'conta', 'cartao', 'categoria', 'etiqueta', 'recorrencia',
    'lancamento', 'lancamento_etiqueta', 'anexo', 'historico_alteracao',
    'orcamento', 'meta', 'meta_movimento', 'investimento', 'investimento_movimento',
    'filtro_salvo'
  ])
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "familia_acesso_total" on %I', t);
    execute format(
      'create policy "familia_acesso_total" on %I for all to authenticated using ((auth.jwt() ->> ''email'') = %L) with check ((auth.jwt() ->> ''email'') = %L)',
      t, email_permitido, email_permitido
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Tempo real: sem isso, mudanças feitas num aparelho não avisam os outros.
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'responsavel', 'conta', 'cartao', 'categoria', 'lancamento', 'orcamento',
    'meta', 'meta_movimento', 'investimento', 'investimento_movimento', 'recorrencia'
  ])
  loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object then
      null; -- já estava na publicação, ok
    end;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Dados padrão (responsáveis e categorias) — os mesmos 4 nomes e categorias
-- que o app sempre usou. Idempotente: rodar de novo não duplica.
-- ---------------------------------------------------------------------------

insert into responsavel (id, nome, cor, icone) values
  ('resp-as', 'AS', '#6C4CE0', 'user'),
  ('resp-cleusa', 'Cleusa', '#E05A97', 'user'),
  ('resp-alex', 'Alex', '#2AA9A0', 'user'),
  ('resp-nykolly', 'Nykolly', '#E0A03C', 'user')
on conflict (id) do nothing;

insert into categoria (id, nome, tipo, cor, icone) values
  ('cat-moradia', 'Moradia', 'despesa', '#6C4CE0', 'home'),
  ('cat-alimentacao', 'Alimentação', 'despesa', '#E0A03C', 'utensils'),
  ('cat-transporte', 'Transporte', 'despesa', '#2AA9A0', 'car'),
  ('cat-saude', 'Saúde', 'despesa', '#E05A5A', 'heart-pulse'),
  ('cat-pet', 'Pet', 'despesa', '#B07A3C', 'paw-print'),
  ('cat-assinaturas', 'Assinaturas', 'despesa', '#4C6FE0', 'repeat'),
  ('cat-hobby', 'Hobby/Colecionáveis', 'despesa', '#A03CE0', 'gamepad-2'),
  ('cat-emprestimos', 'Empréstimos', 'despesa', '#E05A97', 'landmark'),
  ('cat-compras', 'Compras', 'despesa', '#3C9FE0', 'shopping-bag'),
  ('cat-educacao', 'Educação', 'despesa', '#3CE0A0', 'graduation-cap'),
  ('cat-lazer', 'Lazer', 'despesa', '#E0703C', 'popcorn'),
  ('cat-outros-despesa', 'Outros', 'despesa', '#8A8698', 'more-horizontal'),
  ('cat-salario', 'Salário', 'receita', '#2AA96B', 'wallet'),
  ('cat-freelance', 'Freelance', 'receita', '#2AA9A0', 'briefcase'),
  ('cat-investimentos-receita', 'Investimentos', 'receita', '#6C4CE0', 'trending-up'),
  ('cat-outros-receita', 'Outros', 'receita', '#8A8698', 'more-horizontal')
on conflict (id) do nothing;
