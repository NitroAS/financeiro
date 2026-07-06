-- Limpeza de lançamentos duplicados no Supabase (SQL Editor > New query).
--
-- Contexto: até a correção em src/features/importacao/importacao.service.ts, a checagem de
-- "já importado antes" na importação de xlsx não limitava a busca, e a API do Supabase corta
-- em 1000 linhas por consulta — com a tabela passando desse total, a checagem "esquecia"
-- lançamentos antigos e reimportava tudo de novo a cada nova planilha. Esse script limpa o que
-- já duplicou. SEMPRE rode a PARTE 1 (SELECT) antes da PARTE 2 (DELETE) pra conferir o que vai
-- ser apagado. Considere baixar um backup (botão de download no topo do app) antes de rodar.

-- ---------------------------------------------------------------------------
-- PARTE 1 — Duplicados vindos da importação de xlsx (têm origem_importacao preenchida).
-- Esse é o caso claro e seguro: mesma origem_importacao = com certeza é a mesma linha da
-- planilha inserida mais de uma vez.
-- ---------------------------------------------------------------------------

-- 1a. Só olhar, não apaga nada: mostra quantas cópias existem por origem_importacao.
select origem_importacao, count(*) as copias
from lancamento
where origem_importacao is not null and deleted_at is null
group by origem_importacao
having count(*) > 1
order by copias desc;

-- 1b. Quando estiver satisfeito com o que a consulta acima mostrou, rode este DELETE.
-- Mantém a cópia mais antiga (menor criado_em) de cada origem_importacao e apaga as demais.
delete from lancamento
where id in (
  select id from (
    select id,
           row_number() over (partition by origem_importacao order by criado_em asc, id asc) as rn
    from lancamento
    where origem_importacao is not null and deleted_at is null
  ) t
  where t.rn > 1
);

-- ---------------------------------------------------------------------------
-- PARTE 2 — Possíveis duplicados de clique duplo no botão "Lançar" (origem_importacao vazia,
-- criados manualmente pelo app). Aqui não dá pra ter 100% de certeza — duas compras iguais no
-- mesmo dia (ex.: dois cafés de R$ 8) também aparecem como "duplicadas" por essa lógica. Por
-- isso esta parte só mostra candidatos; a decisão de apagar é sua, um por um.
-- ---------------------------------------------------------------------------

select
  min(id) as um_dos_ids,
  array_agg(id) as todos_os_ids,
  tipo, descricao, valor, data, categoria_id, conta_id, cartao_id, responsavel_id,
  grupo_parcelamento_id, parcela_atual, parcela_total, recorrencia_id,
  count(*) as copias
from lancamento
where origem_importacao is null and deleted_at is null
group by tipo, descricao, valor, data, categoria_id, conta_id, cartao_id, responsavel_id,
         grupo_parcelamento_id, parcela_atual, parcela_total, recorrencia_id
having count(*) > 1
order by copias desc;

-- Pra apagar um candidato específico depois de conferir que é duplicata mesmo (troque o id):
-- delete from lancamento where id = 'cole-aqui-o-id-da-copia-extra';
