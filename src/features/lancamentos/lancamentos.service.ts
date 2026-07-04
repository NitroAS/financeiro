import { Injectable, inject, signal } from '@angular/core';
import { and, desc, eq, gte, isNull, lt } from 'drizzle-orm';
import { DbService } from '../../core/db/db.service';
import { lancamento } from '../../core/db/schema';
import { gerarParcelas, type NovoParcelamento } from '../../shared/utils/parcelamento';

export type Lancamento = typeof lancamento.$inferSelect;

export interface NovoLancamentoInput {
  tipo: 'receita' | 'despesa';
  descricao: string;
  valor: number;
  data: Date;
  categoriaId?: string;
  contaId?: string;
  cartaoId?: string;
  responsavelId?: string;
  formaPagamento?: string;
  observacao?: string;
  parcelado: boolean;
  totalParcelas: number;
}

@Injectable({ providedIn: 'root' })
export class LancamentosService {
  private readonly dbService = inject(DbService);

  readonly lancamentos = signal<Lancamento[]>([]);
  readonly mesReferencia = signal<{ mes: number; ano: number }>(mesAtual());

  async carregar(): Promise<void> {
    const { mes, ano } = this.mesReferencia();
    const inicio = new Date(ano, mes, 1).toISOString();
    const fim = new Date(ano, mes + 1, 1).toISOString();

    const rows = await this.dbService.db
      .select()
      .from(lancamento)
      .where(and(isNull(lancamento.deletedAt), gte(lancamento.data, inicio), lt(lancamento.data, fim)))
      .orderBy(desc(lancamento.data));

    this.lancamentos.set(rows);
  }

  irParaMes(mes: number, ano: number): void {
    this.mesReferencia.set({ mes, ano });
    void this.carregar();
  }

  async criar(input: NovoLancamentoInput): Promise<void> {
    const base = {
      contaId: input.contaId || undefined,
      cartaoId: input.cartaoId || undefined,
      categoriaId: input.categoriaId || undefined,
      responsavelId: input.responsavelId || undefined,
      formaPagamento: input.formaPagamento || undefined,
      observacao: input.observacao || undefined,
    };

    if (input.parcelado && input.totalParcelas > 1) {
      const parcelamentoInput: NovoParcelamento = {
        descricao: input.descricao,
        valorParcela: input.valor,
        totalParcelas: input.totalParcelas,
        dataPrimeiraParcela: input.data,
        ...base,
      };
      const parcelas = gerarParcelas(parcelamentoInput).map((p) => ({ ...p, tipo: input.tipo }));
      await this.dbService.db.insert(lancamento).values(parcelas);
    } else {
      await this.dbService.db.insert(lancamento).values({
        tipo: input.tipo,
        descricao: input.descricao,
        valor: input.valor,
        data: input.data.toISOString(),
        vencimento: input.data.toISOString(),
        status: 'pendente',
        ...base,
      });
    }

    await this.carregar();
  }

  async marcarPago(id: string): Promise<void> {
    await this.dbService.db
      .update(lancamento)
      .set({ status: 'pago', dataPagamento: new Date().toISOString() })
      .where(eq(lancamento.id, id));
    await this.carregar();
  }

  async remover(id: string): Promise<void> {
    await this.dbService.db.update(lancamento).set({ deletedAt: new Date().toISOString() }).where(eq(lancamento.id, id));
    await this.carregar();
  }
}

function mesAtual(): { mes: number; ano: number } {
  const hoje = new Date();
  return { mes: hoje.getMonth(), ano: hoje.getFullYear() };
}
