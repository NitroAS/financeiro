import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config/runtime-config.generated';
import { SupabaseDb } from './query-builder';

export const supabaseConfigurado = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = supabaseConfigurado
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

export const db = new SupabaseDb(
  supabase ??
    // Cliente "fantasma": só existe pra o app não quebrar ao importar antes de configurar o
    // Supabase — qualquer chamada real cai no erro tratado por DbService.error().
    (new Proxy(
      {},
      {
        get() {
          throw new Error('Supabase não configurado: defina SUPABASE_URL e SUPABASE_ANON_KEY.');
        },
      },
    ) as never),
);
