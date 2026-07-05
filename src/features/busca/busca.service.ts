import { Injectable, inject } from '@angular/core';
import { and, isNull, or, like } from 'drizzle-orm';
import { DbService } from '../../core/db/db.service';
import { lancamento } from '../../core/db/schema';
import type { Lancamento } from '../lancamentos/lancamentos.service';

@Injectable({ providedIn: 'root' })
export class BuscaService {
  private readonly dbService = inject(DbService);

  async buscarLancamentos(termo: string): Promise<Lancamento[]> {
    const t = termo.trim();
    if (!t) return [];
    return this.dbService.db
      .select()
      .from(lancamento)
      .where(
        and(
          isNull(lancamento.deletedAt),
          or(like(lancamento.descricao, `%${t}%`), like(lancamento.observacao, `%${t}%`)),
        ),
      )
      .orderBy(lancamento.data)
      .limit(20);
  }
}
