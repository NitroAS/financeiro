import { Injectable, signal } from '@angular/core';
import type { Session } from '@supabase/supabase-js';
import { supabase, supabaseConfigurado } from '../db/db.client';

/**
 * Login único e compartilhado da família (um e-mail/senha combinado, criado direto no painel
 * do Supabase) — não é uma conta por pessoa, é só a trava para que os dados no Supabase não
 * fiquem abertos pra qualquer um que descubra a chave pública do site. Uma vez autenticado
 * num aparelho, a sessão fica salva (o supabase-js já cuida disso) e não pede de novo.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly sessao = signal<Session | null>(null);
  readonly carregando = signal(true);
  readonly configurado = supabaseConfigurado;

  constructor() {
    if (!supabase) {
      this.carregando.set(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      this.sessao.set(data.session);
      this.carregando.set(false);
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      this.sessao.set(session);
    });
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
