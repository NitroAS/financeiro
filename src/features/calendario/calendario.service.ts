import { Injectable, inject, signal } from '@angular/core';
import { and, gte, isNull, lt } from 'drizzle-orm';
import { DbService } from '../../core/db/db.service';
import { lancamento } from '../../core/db/schema';
import type { Lancamento } from '../lancamentos/lancamentos.service';

export interface DiaCalendario {
  dia: number;
  data: Date;
  lancamentos: Lancamento[];
  totalReceitas: number;
  totalDespesas: number;
}

@Injectable({ providedIn: 'root' })
export class CalendarioService {
  private readonly dbService = inject(DbService);

  readonly mesReferencia = signal<{ mes: number; ano: number }>(mesAtual());
  readonly dias = signal<DiaCalendario[]>([]);

  async carregar(): Promise<void> {
    const { mes, ano } = this.mesReferencia();
    const inicio = new Date(ano, mes, 1).toISOString();
    const fim = new Date(ano, mes + 1, 1).toISOString();

    const rows = await this.dbService.db
      .select()
      .from(lancamento)
      .where(and(isNull(lancamento.deletedAt), gte(lancamento.data, inicio), lt(lancamento.data, fim)));

    const totalDias = new Date(ano, mes + 1, 0).getDate();
    const dias: DiaCalendario[] = Array.from({ length: totalDias }, (_, i) => ({
      dia: i + 1,
      data: new Date(ano, mes, i + 1),
      lancamentos: [],
      totalReceitas: 0,
      totalDespesas: 0,
    }));

    for (const l of rows) {
      const dataRef = (l.vencimento ?? l.data).slice(0, 10);
      const dia = Number(dataRef.slice(8, 10));
      const bucket = dias[dia - 1];
      if (!bucket) continue;
      bucket.lancamentos.push(l);
      if (l.tipo === 'receita') bucket.totalReceitas += l.valor;
      else bucket.totalDespesas += l.valor;
    }

    this.dias.set(dias);
  }

  irParaMes(mes: number, ano: number): void {
    this.mesReferencia.set({ mes, ano });
    void this.carregar();
  }
}

function mesAtual(): { mes: number; ano: number } {
  const hoje = new Date();
  return { mes: hoje.getMonth(), ano: hoje.getFullYear() };
}
