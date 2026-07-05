import { Injectable, signal } from '@angular/core';
import { db, supabase, supabaseConfigurado } from './db.client';
import { responsavel } from './schema';

@Injectable({ providedIn: 'root' })
export class DbService {
  readonly isReady = signal(false);
  readonly error = signal<string | null>(null);
  readonly db = db;

  constructor() {
    if (!supabaseConfigurado || !supabase) {
      this.error.set('Supabase não configurado (SUPABASE_URL/SUPABASE_ANON_KEY ausentes no build).');
      return;
    }
    // Pinga o banco com uma consulta simples pra confirmar que a URL/chave realmente funcionam.
    Promise.resolve(db.select().from(responsavel).limit(1)).then(
      () => this.isReady.set(true),
      (err: unknown) => {
        console.error('[DbService] falha ao conectar no Supabase', err);
        this.error.set(err instanceof Error ? err.message : String(err));
      },
    );
  }
}
