-- Rode isto no SQL Editor do Supabase (Database > SQL Editor > New query) antes de usar a
-- opção "Recorrente permanentemente". Sem essa coluna, criar ou marcar uma recorrência como
-- permanente vai dar erro (a tabela recorrencia não tem esse campo ainda).
--
-- É seguro rodar mesmo se você já rodou supabase/schema.sql de novo depois dessa mudança —
-- o "if not exists" evita erro de coluna duplicada.

alter table recorrencia add column if not exists permanente boolean not null default false;
