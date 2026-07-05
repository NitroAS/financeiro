import { Injectable, inject, signal } from '@angular/core';
import { and, eq, isNull } from 'drizzle-orm';
import { DbService } from '../../core/db/db.service';
import { cartao, lancamento } from '../../core/db/schema';
import { cicloFaturaAberto } from '../../shared/utils/fatura';

export type Cartao = typeof cartao.$inferSelect;
export type NovoCartao = typeof cartao.$inferInsert;

export interface ResumoCartao {
  usado: number;
  disponivel: number;
  fechamento: Date;
  vencimento: Date;
  valorFaturaAberta: number;
  lancamentosFaturaAberta: (typeof lancamento.$inferSelect)[];
}

@Injectable({ providedIn: 'root' })
export class CartoesService {
  private readonly dbService = inject(DbService);

  readonly cartoes = signal<Cartao[]>([]);
  readonly resumos = signal<Record<string, ResumoCartao>>({});

  async carregar(): Promise<void> {
    const rows = await this.dbService.db.select().from(cartao).orderBy(cartao.nome);
    this.cartoes.set(rows);
    await this.carregarResumos(rows);
  }

  private async carregarResumos(cartoes: Cartao[]): Promise<void> {
    const hoje = new Date();
    const resumos: Record<string, ResumoCartao> = {};

    for (const c of cartoes) {
      const pendentes = await this.dbService.db
        .select()
        .from(lancamento)
        .where(and(eq(lancamento.cartaoId, c.id), eq(lancamento.status, 'pendente'), isNull(lancamento.deletedAt)));

      const { inicio, fechamento, vencimento } = cicloFaturaAberto(hoje, c.diaFechamento, c.diaVencimento);
      const usado = pendentes.reduce((acc, l) => acc + l.valor, 0);
      const lancamentosFaturaAberta = pendentes.filter((l) => l.data > inicio.toISOString() && l.data <= fechamento.toISOString());

      resumos[c.id] = {
        usado,
        disponivel: c.limite - usado,
        fechamento,
        vencimento,
        valorFaturaAberta: lancamentosFaturaAberta.reduce((acc, l) => acc + l.valor, 0),
        lancamentosFaturaAberta,
      };
    }

    this.resumos.set(resumos);
  }

  async criar(valores: NovoCartao): Promise<void> {
    await this.dbService.db.insert(cartao).values(valores);
    await this.carregar();
  }

  async remover(id: string): Promise<void> {
    await this.dbService.db.delete(cartao).where(eq(cartao.id, id));
    await this.carregar();
  }
}
