import { Injectable, inject } from '@angular/core';
import { and, isNull, like } from 'drizzle-orm';
import { DbService } from '../../core/db/db.service';
import { lancamento } from '../../core/db/schema';
import type { Lancamento } from '../lancamentos/lancamentos.service';

@Injectable({ providedIn: 'root' })
export class BuscaService {
  private readonly dbService = inject(DbService);

  async buscarLancamentos(termo: string): Promise<Lancamento[]> {
    if (!termo.trim()) return [];
    return this.dbService.db
      .select()
      .from(lancamento)
      .where(and(isNull(lancamento.deletedAt), like(lancamento.descricao, `%${termo}%`)))
      .limit(20);
  }
}
