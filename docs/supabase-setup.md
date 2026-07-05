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

## 5. (Opcional, recomendado) Entrar com Google em vez de e-mail/senha

Em vez de digitar e-mail/senha toda vez, dá pra entrar com um clique usando "Entrar com Google",
travado a um único e-mail (só essa conta consegue entrar, mesmo que outra pessoa tenha a chave
pública do site).

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/) e crie um projeto novo
   (ou use um existente).
2. Vá em **APIs & Services → OAuth consent screen**. Escolha **External**, preencha o nome do
   app e o seu e-mail (nos campos obrigatórios) e salve. Não precisa publicar/verificar o app —
   ele funciona em modo de teste contanto que você adicione seu e-mail em **Test users**.
3. Vá em **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
   - Tipo de aplicativo: **Web application**
   - Em **Authorized redirect URIs**, adicione: `https://<seu-projeto>.supabase.co/auth/v1/callback`
     (troque `<seu-projeto>` pelo mesmo início da sua Project URL do passo 4)
4. Copie o **Client ID** e o **Client Secret** gerados.
5. No painel do Supabase, vá em **Authentication → Providers → Google**, ative, cole o Client ID
   e o Client Secret, salve.
6. Em **Authentication → URL Configuration**, defina a **Site URL** como a URL do seu app
   publicado (ex.: `https://financeiro-mocha-theta.vercel.app`) e adicione essa mesma URL em
   **Redirect URLs**.
7. Defina mais uma variável de ambiente (local `.env` e/ou Vercel): `ALLOWED_GOOGLE_EMAIL` com o
   e-mail Gmail que deve ser o único permitido a entrar.
8. Volte no **SQL Editor** do Supabase e rode de novo o bloco de políticas (RLS) do
   `supabase/schema.sql` depois de trocar `alexsandrodevelop@gmail.com` pelo seu e-mail — ele já
   substitui a política antiga (a que liberava qualquer usuário autenticado) por uma que só libera
   esse e-mail específico.

## 6. Configurar no app

**Local (rodando na sua máquina):** crie um arquivo `.env` na raiz do projeto:

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
ALLOWED_GOOGLE_EMAIL=seuemail@gmail.com
```

**Produção (Vercel):** em **Project Settings → Environment Variables**, adicione as mesmas
chaves (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ALLOWED_GOOGLE_EMAIL`), marcando **Production**, e
faça um novo deploy (o botão "Redeploy" num deploy existente — mudar variável sozinho não
republica o site).

Pronto — ao abrir o app, aparece "Entrar com Google" (ou o e-mail/senha do passo 3, como
alternativa). Depois do primeiro login, a sessão fica salva naquele aparelho/navegador (não pede
de novo).

## Sobre segurança

A anon key fica visível no código do site publicado (é assim que o Supabase funciona — ela não é
secreta por si só). O que protege os dados de verdade é a política de RLS do passo 2/5 (só libera
o e-mail configurado) — o `ALLOWED_GOOGLE_EMAIL` do app é só uma conveniência de UX (mostra um erro
mais claro e desloga na hora), não é a trava principal. Não compartilhe o e-mail/senha do passo 3
fora da família.
