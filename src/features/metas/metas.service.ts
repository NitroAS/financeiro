import { Injectable, inject, signal } from '@angular/core';
import { eq, sql } from 'drizzle-orm';
import { DbService } from '../../core/db/db.service';
import { meta, metaMovimento } from '../../core/db/schema';

export type Meta = typeof meta.$inferSelect;
export type NovaMeta = typeof meta.$inferInsert;

export interface MetaComPrevisao extends Meta {
  percentual: number;
  falta: number;
  previsaoMeses: number | null;
}

@Injectable({ providedIn: 'root' })
export class MetasService {
  private readonly dbService = inject(DbService);

  readonly metas = signal<MetaComPrevisao[]>([]);

  async carregar(): Promise<void> {
    const db = this.dbService.db;
    const rows = await db.select().from(meta).orderBy(meta.nome);

    const comPrevisao = await Promise.all(
      rows.map(async (m): Promise<MetaComPrevisao> => {
        const aportes = await db
          .select()
          .from(metaMovimento)
          .where(eq(metaMovimento.metaId, m.id));

        const totalAportado = aportes.filter((a) => a.tipo === 'aporte').reduce((acc, a) => acc + a.valor, 0);
        const mesesDistintos = new Set(aportes.map((a) => a.data.slice(0, 7))).size;
        const mediaMensal = mesesDistintos > 0 ? totalAportado / mesesDistintos : 0;
        const falta = Math.max(0, m.valorAlvo - m.valorAtual);

        return {
          ...m,
          percentual: m.valorAlvo > 0 ? Math.min(100, (m.valorAtual / m.valorAlvo) * 100) : 0,
          falta,
          previsaoMeses: mediaMensal > 0 && falta > 0 ? Math.ceil(falta / mediaMensal) : null,
        };
      }),
    );

    this.metas.set(comPrevisao);
  }

  async criar(valores: NovaMeta): Promise<void> {
    await this.dbService.db.insert(meta).values(valores);
    await this.carregar();
  }

  async registrarMovimento(metaId: string, tipo: 'aporte' | 'resgate', valor: number): Promise<void> {
    const db = this.dbService.db;
    await db.insert(metaMovimento).values({ metaId, tipo, valor, data: new Date().toISOString() });
    const delta = tipo === 'aporte' ? valor : -valor;
    await db
      .update(meta)
      .set({ valorAtual: sql`${meta.valorAtual} + ${delta}` })
      .where(eq(meta.id, metaId));
    await this.carregar();
  }

  async remover(id: string): Promise<void> {
    await this.dbService.db.delete(meta).where(eq(meta.id, id));
    await this.carregar();
  }
}
