import { Injectable, inject, signal } from '@angular/core';
import { and, eq, gte, isNull, lt } from 'drizzle-orm';
import { DbService } from '../../core/db/db.service';
import { categoria, lancamento } from '../../core/db/schema';
import { RESPONSAVEIS_PADRAO } from '../../shared/constants/seed-data';
import type { Lancamento } from '../lancamentos/lancamentos.service';

export interface FiltroRelatorio {
  meses: number; // janela: últimos N meses a partir do mês atual (inclusive)
  categoriaId?: string;
  contaId?: string;
  cartaoId?: string;
  responsavelId?: string;
}

export interface FatiaCategoria {
  categoriaId: string;
  nome: string;
  cor: string;
  valor: number;
}

export interface FatiaResponsavel {
  responsavelId: string;
  nome: string;
  cor: string;
  valor: number;
}

export interface PontoFluxoCaixa {
  label: string;
  receitas: number;
  despesas: number;
}

@Injectable({ providedIn: 'root' })
export class RelatoriosService {
  private readonly dbService = inject(DbService);

  readonly lancamentos = signal<Lancamento[]>([]);
  readonly gastosPorCategoria = signal<FatiaCategoria[]>([]);
  readonly gastosPorResponsavel = signal<FatiaResponsavel[]>([]);
  readonly fluxoCaixa = signal<PontoFluxoCaixa[]>([]);

  async carregar(filtro: FiltroRelatorio): Promise<void> {
    const db = this.dbService.db;
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - (filtro.meses - 1), 1);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);

    const condicoes = [isNull(lancamento.deletedAt), gte(lancamento.data, inicio.toISOString()), lt(lancamento.data, fim.toISOString())];
    if (filtro.categoriaId) condicoes.push(eq(lancamento.categoriaId, filtro.categoriaId));
    if (filtro.contaId) condicoes.push(eq(lancamento.contaId, filtro.contaId));
    if (filtro.cartaoId) condicoes.push(eq(lancamento.cartaoId, filtro.cartaoId));
    if (filtro.responsavelId) condicoes.push(eq(lancamento.responsavelId, filtro.responsavelId));

    const rows = await db.select().from(lancamento).where(and(...condicoes));
    this.lancamentos.set(rows);

    const categorias = await db.select().from(categoria);
    const porCategoria = new Map<string, number>();
    for (const l of rows) {
      if (l.tipo !== 'despesa' || !l.categoriaId) continue;
      porCategoria.set(l.categoriaId, (porCategoria.get(l.categoriaId) ?? 0) + l.valor);
    }
    const fatias = Array.from(porCategoria.entries())
      .map(([categoriaId, valor]) => {
        const c = categorias.find((cat) => cat.id === categoriaId);
        return { categoriaId, nome: c?.nome ?? 'Outros', cor: c?.cor ?? '#8A8698', valor };
      })
      .sort((a, b) => b.valor - a.valor);
    this.gastosPorCategoria.set(fatias);

    const porResponsavel = new Map<string, number>();
    for (const l of rows) {
      if (l.tipo !== 'despesa' || !l.responsavelId) continue;
      porResponsavel.set(l.responsavelId, (porResponsavel.get(l.responsavelId) ?? 0) + l.valor);
    }
    const fatiasResponsavel = Array.from(porResponsavel.entries())
      .map(([responsavelId, valor]) => {
        const r = RESPONSAVEIS_PADRAO.find((resp) => resp.id === responsavelId);
        return { responsavelId, nome: r?.nome ?? 'Sem responsável', cor: r?.cor ?? '#8A8698', valor };
      })
      .sort((a, b) => b.valor - a.valor);
    this.gastosPorResponsavel.set(fatiasResponsavel);

    const pontos: PontoFluxoCaixa[] = [];
    for (let i = filtro.meses - 1; i >= 0; i--) {
      const ref = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const inicioMes = ref.toISOString();
      const fimMes = new Date(ref.getFullYear(), ref.getMonth() + 1, 1).toISOString();
      const doMes = rows.filter((l) => l.data >= inicioMes && l.data < fimMes);
      pontos.push({
        label: ref.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        receitas: doMes.filter((l) => l.tipo === 'receita').reduce((acc, l) => acc + l.valor, 0),
        despesas: doMes.filter((l) => l.tipo === 'despesa').reduce((acc, l) => acc + l.valor, 0),
      });
    }
    this.fluxoCaixa.set(pontos);
  }
}
