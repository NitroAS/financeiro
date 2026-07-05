import { Injectable, inject, signal } from '@angular/core';
import { eq } from 'drizzle-orm';
import { DbService } from '../../core/db/db.service';
import { investimento, investimentoMovimento } from '../../core/db/schema';

export type Investimento = typeof investimento.$inferSelect;
export type NovoInvestimento = typeof investimento.$inferInsert;

export interface InvestimentoComSaldo extends Investimento {
  aportado: number;
  resgatado: number;
  rendimento: number;
  saldo: number;
}

@Injectable({ providedIn: 'root' })
export class InvestimentosService {
  private readonly dbService = inject(DbService);

  readonly investimentos = signal<InvestimentoComSaldo[]>([]);

  get patrimonioTotal(): number {
    return this.investimentos().reduce((acc, i) => acc + i.saldo, 0);
  }

  get lucroTotal(): number {
    return this.investimentos().reduce((acc, i) => acc + i.rendimento, 0);
  }

  async carregar(): Promise<void> {
    const db = this.dbService.db;
    const rows = await db.select().from(investimento).orderBy(investimento.nome);

    const comSaldo = await Promise.all(
      rows.map(async (i): Promise<InvestimentoComSaldo> => {
        const movimentos = await db
          .select()
          .from(investimentoMovimento)
          .where(eq(investimentoMovimento.investimentoId, i.id));

        const aportado = movimentos.filter((m) => m.tipo === 'aporte').reduce((acc, m) => acc + m.valor, 0);
        const resgatado = movimentos.filter((m) => m.tipo === 'resgate').reduce((acc, m) => acc + m.valor, 0);
        const rendimento = movimentos.filter((m) => m.tipo === 'rendimento').reduce((acc, m) => acc + m.valor, 0);

        return { ...i, aportado, resgatado, rendimento, saldo: aportado - resgatado + rendimento };
      }),
    );

    this.investimentos.set(comSaldo);
  }

  async criar(valores: NovoInvestimento): Promise<void> {
    await this.dbService.db.insert(investimento).values(valores);
    await this.carregar();
  }

  async atualizar(id: string, valores: Partial<NovoInvestimento>): Promise<void> {
    await this.dbService.db.update(investimento).set(valores).where(eq(investimento.id, id));
    await this.carregar();
  }

  async registrarMovimento(investimentoId: string, tipo: 'aporte' | 'resgate' | 'rendimento', valor: number): Promise<void> {
    await this.dbService.db
      .insert(investimentoMovimento)
      .values({ investimentoId, tipo, valor, data: new Date().toISOString() });
    await this.carregar();
  }

  async remover(id: string): Promise<void> {
    await this.dbService.db.delete(investimento).where(eq(investimento.id, id));
    await this.carregar();
  }
}
