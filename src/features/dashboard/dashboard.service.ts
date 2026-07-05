import { Injectable, inject, signal } from '@angular/core';
import { and, desc, eq, gte, isNull, lt } from '../../core/db/query-builder';
import { DbService } from '../../core/db/db.service';
import { conta, lancamento } from '../../core/db/schema';
import { RESPONSAVEIS_PADRAO } from '../../shared/constants/seed-data';
import type { Lancamento } from '../lancamentos/lancamentos.service';

export interface ResumoPorResponsavel {
  responsavelId: string;
  nome: string;
  cor: string;
  receitas: number;
  despesas: number;
}

export interface ResumoDashboard {
  saldoContas: number;
  receitasMes: number;
  despesasMes: number;
  economiaMes: number;
  contasVencidas: Lancamento[];
  proximasContas: Lancamento[];
  ultimosLancamentos: Lancamento[];
  porResponsavel: ResumoPorResponsavel[];
}

const RESUMO_VAZIO: ResumoDashboard = {
  saldoContas: 0,
  receitasMes: 0,
  despesasMes: 0,
  economiaMes: 0,
  contasVencidas: [],
  proximasContas: [],
  ultimosLancamentos: [],
  porResponsavel: [],
};

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly dbService = inject(DbService);

  readonly resumo = signal<ResumoDashboard>(RESUMO_VAZIO);

  constructor() {
    this.dbService.db.subscribeTable(lancamento, () => void this.carregar());
    this.dbService.db.subscribeTable(conta, () => void this.carregar());
  }

  async carregar(): Promise<void> {
    const db = this.dbService.db;
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString();
    const inicioProximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1).toISOString();
    const hojeIso = hoje.toISOString();

    const [contas, lancamentosMes, pendentes, ultimos] = await Promise.all([
      db.select().from(conta),
      db
        .select()
        .from(lancamento)
        .where(
          and(isNull(lancamento.deletedAt), gte(lancamento.data, inicioMes), lt(lancamento.data, inicioProximoMes)),
        ),
      db
        .select()
        .from(lancamento)
        .where(and(isNull(lancamento.deletedAt), eq(lancamento.status, 'pendente')))
        .orderBy(lancamento.vencimento),
      db.select().from(lancamento).where(isNull(lancamento.deletedAt)).orderBy(desc(lancamento.criadoEm)).limit(5),
    ]);

    const receitasMes = lancamentosMes.filter((l) => l.tipo === 'receita').reduce((acc, l) => acc + l.valor, 0);
    const despesasMes = lancamentosMes.filter((l) => l.tipo === 'despesa').reduce((acc, l) => acc + l.valor, 0);

    const porResponsavel = RESPONSAVEIS_PADRAO.map((r) => {
      const doResponsavel = lancamentosMes.filter((l) => l.responsavelId === r.id);
      return {
        responsavelId: r.id,
        nome: r.nome,
        cor: r.cor,
        receitas: doResponsavel.filter((l) => l.tipo === 'receita').reduce((acc, l) => acc + l.valor, 0),
        despesas: doResponsavel.filter((l) => l.tipo === 'despesa').reduce((acc, l) => acc + l.valor, 0),
      };
    }).filter((r) => r.receitas > 0 || r.despesas > 0);

    this.resumo.set({
      saldoContas: contas.reduce((acc, c) => acc + c.saldoInicial, 0),
      receitasMes,
      despesasMes,
      economiaMes: receitasMes - despesasMes,
      contasVencidas: pendentes.filter((l) => (l.vencimento ?? l.data) < hojeIso),
      proximasContas: pendentes.filter((l) => (l.vencimento ?? l.data) >= hojeIso).slice(0, 5),
      ultimosLancamentos: ultimos,
      porResponsavel,
    });
  }
}
