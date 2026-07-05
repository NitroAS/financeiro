import { Injectable, inject, signal } from '@angular/core';
import { and, desc, eq, gte, isNotNull, isNull, lt } from '../../core/db/query-builder';
import { DbService } from '../../core/db/db.service';
import { lancamento, recorrencia } from '../../core/db/schema';
import { addMonthsClamped, gerarParcelas, type NovoParcelamento } from '../../shared/utils/parcelamento';

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

export interface NovaRecorrenciaInput {
  tipo: 'receita' | 'despesa';
  descricao: string;
  valor: number;
  data: Date;
  meses: number;
  categoriaId?: string;
  contaId?: string;
  cartaoId?: string;
  responsavelId?: string;
  observacao?: string;
}

export interface EdicaoLancamentoInput {
  tipo: 'receita' | 'despesa';
  descricao: string;
  valor: number;
  data: Date;
  status: 'pendente' | 'pago';
  categoriaId?: string;
  contaId?: string;
  cartaoId?: string;
  responsavelId?: string;
  observacao?: string;
}

@Injectable({ providedIn: 'root' })
export class LancamentosService {
  private readonly dbService = inject(DbService);

  readonly lancamentos = signal<Lancamento[]>([]);
  readonly lixeira = signal<Lancamento[]>([]);
  readonly mesReferencia = signal<{ mes: number; ano: number }>(mesAtual());
  readonly filtroResponsavelId = signal<string>('');
  readonly destacarId = signal<string | null>(null);

  constructor() {
    this.dbService.db.subscribeTable(lancamento, () => void this.carregar());
  }

  async carregar(): Promise<void> {
    const { mes, ano } = this.mesReferencia();
    const inicio = new Date(ano, mes, 1).toISOString();
    const fim = new Date(ano, mes + 1, 1).toISOString();
    const responsavelId = this.filtroResponsavelId();

    const condicoes = [isNull(lancamento.deletedAt), gte(lancamento.data, inicio), lt(lancamento.data, fim)];
    if (responsavelId) condicoes.push(eq(lancamento.responsavelId, responsavelId));

    const rows = await this.dbService.db
      .select()
      .from(lancamento)
      .where(and(...condicoes))
      .orderBy(desc(lancamento.data));

    this.lancamentos.set(rows);
  }

  irParaMes(mes: number, ano: number): void {
    this.mesReferencia.set({ mes, ano });
    void this.carregar();
  }

  filtrarPorResponsavel(responsavelId: string): void {
    this.filtroResponsavelId.set(responsavelId);
    void this.carregar();
  }

  /** Usado pela busca global: pula direto para o mês do lançamento (limpando qualquer
   * filtro de responsável que possa escondê-lo) e marca o item para ser destacado na tela. */
  async irParaLancamento(l: Lancamento): Promise<void> {
    const data = new Date(l.data);
    this.filtroResponsavelId.set('');
    this.mesReferencia.set({ mes: data.getMonth(), ano: data.getFullYear() });
    this.destacarId.set(l.id);
    await this.carregar();
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

  /** Gera de uma vez as próximas N ocorrências mensais (ex.: salário, aluguel), todas ligadas
   * pelo mesmo recorrenciaId — ver `removerRecorrencia` para interromper as futuras. */
  async criarRecorrente(input: NovaRecorrenciaInput): Promise<void> {
    const recorrenciaId = crypto.randomUUID();
    await this.dbService.db.insert(recorrencia).values({
      id: recorrenciaId,
      frequencia: 'mensal',
      diaReferencia: input.data.getDate(),
      ativa: true,
    });

    const base = {
      tipo: input.tipo,
      descricao: input.descricao,
      valor: input.valor,
      status: 'pendente' as const,
      contaId: input.contaId || undefined,
      cartaoId: input.cartaoId || undefined,
      categoriaId: input.categoriaId || undefined,
      responsavelId: input.responsavelId || undefined,
      observacao: input.observacao || undefined,
      recorrenciaId,
    };

    const ocorrencias = Array.from({ length: Math.max(1, input.meses) }, (_, index) => {
      const data = addMonthsClamped(input.data, index).toISOString();
      return { ...base, data, vencimento: data };
    });

    await this.dbService.db.insert(lancamento).values(ocorrencias);
    await this.carregar();
  }

  /** Interrompe uma recorrência: remove (para a lixeira) as ocorrências futuras ainda não
   * vencidas e desativa a regra, preservando o histórico já ocorrido/pago. */
  async removerRecorrencia(recorrenciaId: string): Promise<void> {
    const hoje = new Date();
    const fimMesAtual = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1).toISOString();
    await this.dbService.db
      .update(lancamento)
      .set({ deletedAt: new Date().toISOString() })
      .where(and(eq(lancamento.recorrenciaId, recorrenciaId), gte(lancamento.data, fimMesAtual)));
    await this.dbService.db.update(recorrencia).set({ ativa: false }).where(eq(recorrencia.id, recorrenciaId));
    await this.carregar();
  }

  async atualizar(id: string, input: EdicaoLancamentoInput): Promise<void> {
    const atual = this.lancamentos().find((l) => l.id === id);
    const jaEraPago = atual?.status === 'pago';
    await this.dbService.db
      .update(lancamento)
      .set({
        tipo: input.tipo,
        descricao: input.descricao,
        valor: input.valor,
        data: input.data.toISOString(),
        vencimento: input.data.toISOString(),
        status: input.status,
        dataPagamento: input.status === 'pago' ? (jaEraPago ? atual?.dataPagamento : new Date().toISOString()) : null,
        categoriaId: input.categoriaId || null,
        contaId: input.contaId || null,
        cartaoId: input.cartaoId || null,
        responsavelId: input.responsavelId || null,
        observacao: input.observacao || null,
      })
      .where(eq(lancamento.id, id));
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

  async favoritar(id: string, favorito: boolean): Promise<void> {
    await this.dbService.db.update(lancamento).set({ favorito }).where(eq(lancamento.id, id));
    await this.carregar();
  }

  async duplicar(id: string): Promise<void> {
    const [original] = await this.dbService.db.select().from(lancamento).where(eq(lancamento.id, id));
    if (!original) return;
    const { id: _id, criadoEm: _criadoEm, atualizadoEm: _atualizadoEm, ...resto } = original;
    await this.dbService.db.insert(lancamento).values({
      ...resto,
      status: 'pendente',
      dataPagamento: undefined,
      grupoParcelamentoId: undefined,
      parcelaAtual: undefined,
      parcelaTotal: undefined,
    });
    await this.carregar();
  }

  async carregarLixeira(): Promise<void> {
    const rows = await this.dbService.db
      .select()
      .from(lancamento)
      .where(isNotNull(lancamento.deletedAt))
      .orderBy(desc(lancamento.deletedAt));
    this.lixeira.set(rows);
  }

  async restaurar(id: string): Promise<void> {
    await this.dbService.db.update(lancamento).set({ deletedAt: null }).where(eq(lancamento.id, id));
    await this.carregarLixeira();
    await this.carregar();
  }

  async excluirDefinitivamente(id: string): Promise<void> {
    await this.dbService.db.delete(lancamento).where(eq(lancamento.id, id));
    await this.carregarLixeira();
  }
}

function mesAtual(): { mes: number; ano: number } {
  const hoje = new Date();
  return { mes: hoje.getMonth(), ano: hoje.getFullYear() };
}
