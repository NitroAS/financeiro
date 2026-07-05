# Configurar o Supabase

O app não guarda mais os dados só no navegador — agora usa um projeto Supabase (Postgres na
nuvem) compartilhado por todos os aparelhos da família. Sem essas credenciais, o app abre
mostrando "Supabase não configurado".

## 1. Criar a conta e o projeto

1. Acesse [supabase.com](https://supabase.com) e crie uma conta (GitHub/Google).
2. Clique em **New Project**.
3. Dê um nome (ex.: `financeiro`), crie uma senha de banco (guarde num lugar seguro, mas ela não
   é usada pelo app — só a URL e a anon key importam) e escolha a região mais próxima.
4. Espere 1-2 minutos até o projeto ficar pronto.

## 2. Criar as tabelas

1. No menu lateral, vá em **SQL Editor → New query**.
2. Abra o arquivo [`supabase/schema.sql`](../supabase/schema.sql) deste repositório, copie o
   conteúdo inteiro e cole no editor.
3. Clique em **Run**.

Isso cria as 16 tabelas, ativa Row Level Security (só usuário logado lê/escreve), liga o tempo
real para as tabelas principais, e já insere os 4 responsáveis padrão (AS, Cleusa, Alex, Nykolly)
e as categorias padrão. Pode rodar de novo sem medo — tudo é idempotente.

## 3. Criar o login compartilhado da família

O app não tem conta por pessoa — é um único login que todo mundo da família usa.

1. Vá em **Authentication → Users → Add user → Create new user**.
2. Preencha um e-mail (pode ser qualquer um, não precisa ser real) e uma senha.
3. Marque **Auto Confirm User** (senão o Supabase espera confirmação por e-mail que nunca vai
   chegar, porque o e-mail é fictício).
4. Salve. Essas são as credenciais que todo mundo vai digitar na tela de login do app.

## 4. Pegar a URL e a chave pública

1. Vá em **Project Settings** (ícone de engrenagem) **→ API**.
2. Copie:
   - **Project URL** (algo como `https://xxxxx.supabase.co`)
   - **anon public key** (uma string longa começando com `eyJ...`)

## 5. Configurar no app

**Local (rodando na sua máquina):** crie um arquivo `.env` na raiz do projeto:

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
```

**Produção (Vercel):** em **Project Settings → Environment Variables**, adicione as mesmas duas
chaves (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) e faça um novo deploy.

Pronto — ao abrir o app, ele vai pedir o e-mail/senha criados no passo 3. Depois do primeiro
login, a sessão fica salva naquele aparelho/navegador (não pede de novo).

## Sobre segurança

A anon key fica visível no código do site publicado (é assim que o Supabase funciona — ela não é
secreta por si só). O que protege os dados é a combinação de Row Level Security (ativado no passo
2, só libera acesso pra quem estiver autenticado) + o login do passo 3. Não compartilhe o
e-mail/senha do passo 3 fora da família.
