import { Injectable, signal } from '@angular/core';
import type { Session } from '@supabase/supabase-js';
import { supabase, supabaseConfigurado } from '../db/db.client';
import { ALLOWED_GOOGLE_EMAIL } from '../config/runtime-config.generated';

/**
 * Login da família: "Entrar com Google" travado a um único e-mail (ALLOWED_GOOGLE_EMAIL) — não
 * é uma conta por pessoa, é só a trava para que os dados no Supabase não fiquem abertos pra
 * qualquer um que descubra a chave pública do site. Também aceita o e-mail/senha compartilhado
 * criado direto no painel do Supabase, como alternativa/backup caso o Google não esteja
 * configurado ainda. A trava por e-mail aqui é só conveniência de UX — a de verdade está nas
 * políticas de RLS do banco (supabase/schema.sql), que também checam esse e-mail.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly sessao = signal<Session | null>(null);
  readonly carregando = signal(true);
  readonly configurado = supabaseConfigurado;
  readonly erroAcesso = signal<string | null>(null);

  constructor() {
    if (!supabase) {
      this.carregando.set(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => void this.aplicarSessao(data.session));
    supabase.auth.onAuthStateChange((_event, session) => void this.aplicarSessao(session));
  }

  private async aplicarSessao(session: Session | null): Promise<void> {
    const emailPermitido = ALLOWED_GOOGLE_EMAIL.trim().toLowerCase();
    if (session && emailPermitido && session.user.email?.toLowerCase() !== emailPermitido) {
      this.erroAcesso.set(`A conta ${session.user.email} não tem permissão de acesso a este app.`);
      await supabase?.auth.signOut();
      this.sessao.set(null);
      this.carregando.set(false);
      return;
    }
    this.erroAcesso.set(null);
    this.sessao.set(session);
    this.carregando.set(false);
  }

  async entrarComGoogle(): Promise<string | null> {
    if (!supabase) return 'Supabase não configurado.';
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    return error?.message ?? null;
  }

  async entrar(email: string, senha: string): Promise<string | null> {
    if (!supabase) return 'Supabase não configurado.';
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    return error?.message ?? null;
  }

  async sair(): Promise<void> {
    await supabase?.auth.signOut();
  }
}
