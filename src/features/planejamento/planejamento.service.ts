import { Injectable, inject, signal } from '@angular/core';
import { and, eq, gte, isNull, lt } from '../../core/db/query-builder';
import { DbService } from '../../core/db/db.service';
import { categoria, lancamento, orcamento } from '../../core/db/schema';

export interface LinhaPlanejamento {
  categoriaId: string;
  categoriaNome: string;
  categoriaCor: string;
  orcamentoId?: string;
  valorPlanejado: number;
  valorGasto: number;
}

@Injectable({ providedIn: 'root' })
export class PlanejamentoService {
  private readonly dbService = inject(DbService);

  readonly mesReferencia = signal<{ mes: number; ano: number }>(mesAtual());
  readonly linhas = signal<LinhaPlanejamento[]>([]);

  constructor() {
    this.dbService.db.subscribeTable(orcamento, () => void this.carregar());
    this.dbService.db.subscribeTable(lancamento, () => void this.carregar());
  }

  async carregar(): Promise<void> {
    const { mes, ano } = this.mesReferencia();
    const db = this.dbService.db;

    const categorias = await db.select().from(categoria).where(eq(categoria.tipo, 'despesa'));
    const orcamentos = await db.select().from(orcamento).where(and(eq(orcamento.mes, mes), eq(orcamento.ano, ano)));

    const inicio = new Date(ano, mes, 1).toISOString();
    const fim = new Date(ano, mes + 1, 1).toISOString();
    const lancamentosMes = await db
      .select()
      .from(lancamento)
      .where(
        and(
          eq(lancamento.tipo, 'despesa'),
          isNull(lancamento.deletedAt),
          gte(lancamento.data, inicio),
          lt(lancamento.data, fim),
        ),
      );

    const gastoPorCategoria = new Map<string, number>();
    for (const l of lancamentosMes) {
      if (!l.categoriaId) continue;
      gastoPorCategoria.set(l.categoriaId, (gastoPorCategoria.get(l.categoriaId) ?? 0) + l.valor);
    }

    const linhas: LinhaPlanejamento[] = categorias.map((c) => {
      const orc = orcamentos.find((o) => o.categoriaId === c.id);
      return {
        categoriaId: c.id,
        categoriaNome: c.nome,
        categoriaCor: c.cor,
        orcamentoId: orc?.id,
        valorPlanejado: orc?.valorPlanejado ?? 0,
        valorGasto: gastoPorCategoria.get(c.id) ?? 0,
      };
    });

    this.linhas.set(linhas.sort((a, b) => b.valorGasto - a.valorGasto));
  }

  irParaMes(mes: number, ano: number): void {
    this.mesReferencia.set({ mes, ano });
    void this.carregar();
  }

  async definirOrcamento(linha: LinhaPlanejamento, valor: number): Promise<void> {
    const { mes, ano } = this.mesReferencia();
    const db = this.dbService.db;

    if (linha.orcamentoId) {
      await db.update(orcamento).set({ valorPlanejado: valor }).where(eq(orcamento.id, linha.orcamentoId));
    } else {
      await db.insert(orcamento).values({ categoriaId: linha.categoriaId, mes, ano, valorPlanejado: valor });
    }
    await this.carregar();
  }
}

function mesAtual(): { mes: number; ano: number } {
  const hoje = new Date();
  return { mes: hoje.getMonth(), ano: hoje.getFullYear() };
}
