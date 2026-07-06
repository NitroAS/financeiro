import { Injectable, inject, signal } from '@angular/core';
import { and, desc, eq, gte, isNotNull, isNull, lt } from '../../core/db/query-builder';
import { DbService } from '../../core/db/db.service';
import { lancamento, recorrencia } from '../../core/db/schema';
import { addMonthsClamped, gerarParcelas, type NovoParcelamento } from '../../shared/utils/parcelamento';

export type Lancamento = typeof lancamento.$inferSelect;

/** Uma recorrência "permanente" não tem data pra parar, mas como o app materializa as
 * ocorrências com antecedência (em vez de gerar sob demanda), ela precisa de um horizonte
 * de meses sempre gerados à frente. `manterRecorrenciasPermanentes` completa esse horizonte
 * a cada início de sessão; esses valores controlam o tamanho do horizonte e do lote de
 * reposição quando ele começa a ficar curto. */
const HORIZONTE_MESES_PERMANENTE = 12;
const LOTE_REPOSICAO_PERMANENTE = 12;

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
  parcelaInicial?: number;
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
  /** Sem data pra parar — ignora `meses` e gera logo um horizonte maior (ver HORIZONTE_MESES_PERMANENTE). */
  permanente?: boolean;
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
  /** Se ausente, mantém o vínculo de grupo (parcelamento/recorrência) que o lançamento já tinha. */
  repeticao?: 'nenhuma' | 'parcelado' | 'recorrente';
  quantidade?: number;
  parcelaInicial?: number;
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
    void this.manterRecorrenciasPermanentes();
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
        parcelaInicial: input.parcelaInicial,
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
   * pelo mesmo recorrenciaId — ver `removerRecorrencia` para interromper as futuras, ou
   * `adicionarOcorrencias`/`manterRecorrenciasPermanentes` para gerar mais no futuro. */
  async criarRecorrente(input: NovaRecorrenciaInput): Promise<void> {
    const recorrenciaId = crypto.randomUUID();
    await this.dbService.db.insert(recorrencia).values({
      id: recorrenciaId,
      frequencia: 'mensal',
      diaReferencia: input.data.getDate(),
      ativa: true,
      permanente: input.permanente ?? false,
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

    const meses = input.permanente ? Math.max(input.meses, HORIZONTE_MESES_PERMANENTE) : Math.max(1, input.meses);
    const ocorrencias = Array.from({ length: meses }, (_, index) => {
      const data = addMonthsClamped(input.data, index).toISOString();
      return { ...base, data, vencimento: data };
    });

    await this.dbService.db.insert(lancamento).values(ocorrencias);
    await this.carregar();
  }

  /** Acrescenta mais N parcelas a um parcelamento já existente, continuando os meses a
   * partir da última parcela já gerada (mesmos descrição/valor/categoria/conta/cartão/
   * responsável da última) e atualizando o total em todas as parcelas do grupo. */
  async adicionarParcelas(grupoParcelamentoId: string, quantidadeAdicional: number): Promise<void> {
    if (quantidadeAdicional < 1) return;
    const itens = await this.buscarGrupoParcelamento(grupoParcelamentoId);
    if (!itens.length) return;

    const ultima = [...itens].sort((a, b) => (a.parcelaAtual ?? 0) - (b.parcelaAtual ?? 0)).at(-1)!;
    const novoTotal = (ultima.parcelaTotal ?? itens.length) + quantidadeAdicional;

    await this.dbService.db
      .update(lancamento)
      .set({ parcelaTotal: novoTotal })
      .where(eq(lancamento.grupoParcelamentoId, grupoParcelamentoId));

    const novasParcelas = Array.from({ length: quantidadeAdicional }, (_, index) => {
      const data = addMonthsClamped(new Date(ultima.data), index + 1).toISOString();
      return {
        tipo: ultima.tipo,
        descricao: ultima.descricao,
        valor: ultima.valor,
        data,
        vencimento: data,
        status: 'pendente' as const,
        grupoParcelamentoId,
        parcelaAtual: (ultima.parcelaAtual ?? itens.length) + index + 1,
        parcelaTotal: novoTotal,
        contaId: ultima.contaId ?? undefined,
        cartaoId: ultima.cartaoId ?? undefined,
        categoriaId: ultima.categoriaId ?? undefined,
        responsavelId: ultima.responsavelId ?? undefined,
        observacao: ultima.observacao ?? undefined,
      };
    });
    await this.dbService.db.insert(lancamento).values(novasParcelas);
    await this.carregar();
  }

  /** Acrescenta mais N meses a uma recorrência já existente, continuando a partir da
   * última ocorrência já gerada (mesma descrição/valor/categoria/conta/cartão/responsável). */
  async adicionarOcorrencias(recorrenciaId: string, mesesAdicionais: number): Promise<void> {
    if (mesesAdicionais < 1) return;
    const itens = await this.buscarRecorrencia(recorrenciaId);
    if (!itens.length) return;

    const ultima = [...itens].sort((a, b) => a.data.localeCompare(b.data)).at(-1)!;
    const novasOcorrencias = Array.from({ length: mesesAdicionais }, (_, index) => {
      const data = addMonthsClamped(new Date(ultima.data), index + 1).toISOString();
      return {
        tipo: ultima.tipo,
        descricao: ultima.descricao,
        valor: ultima.valor,
        data,
        vencimento: data,
        status: 'pendente' as const,
        contaId: ultima.contaId ?? undefined,
        cartaoId: ultima.cartaoId ?? undefined,
        categoriaId: ultima.categoriaId ?? undefined,
        responsavelId: ultima.responsavelId ?? undefined,
        observacao: ultima.observacao ?? undefined,
        recorrenciaId,
      };
    });
    await this.dbService.db.insert(lancamento).values(novasOcorrencias);
    await this.carregar();
  }

  /** Liga/desliga a marca de "permanente" numa recorrência já existente. Ao ligar, já
   * completa na hora o horizonte de meses gerados à frente (não espera o próximo carregamento). */
  async definirRecorrenciaPermanente(recorrenciaId: string, permanente: boolean): Promise<void> {
    await this.dbService.db.update(recorrencia).set({ permanente }).where(eq(recorrencia.id, recorrenciaId));
    if (permanente) await this.completarHorizonte(recorrenciaId);
  }

  private async completarHorizonte(recorrenciaId: string): Promise<void> {
    const itens = await this.buscarRecorrencia(recorrenciaId);
    if (!itens.length) return;
    const ultima = [...itens].sort((a, b) => a.data.localeCompare(b.data)).at(-1)!;
    const horizonte = addMonthsClamped(new Date(), HORIZONTE_MESES_PERMANENTE);
    const mesesFaltando = mesesEntre(new Date(ultima.data), horizonte);
    if (mesesFaltando > 0) await this.adicionarOcorrencias(recorrenciaId, Math.min(mesesFaltando, LOTE_REPOSICAO_PERMANENTE));
  }

  /** Roda uma vez por sessão: para cada recorrência ativa marcada como "permanente", garante
   * que sempre há pelo menos HORIZONTE_MESES_PERMANENTE meses já gerados à frente de hoje —
   * como o app materializa ocorrências com antecedência (em vez de sob demanda), sem isso uma
   * recorrência "permanente" simplesmente pararia de existir quando o lote inicial acabasse. */
  async manterRecorrenciasPermanentes(): Promise<void> {
    try {
      const ativas = await this.dbService.db
        .select()
        .from(recorrencia)
        .where(and(eq(recorrencia.ativa, true), eq(recorrencia.permanente, true)));
      for (const r of ativas) {
        await this.completarHorizonte(r.id);
      }
    } catch {
      // Se a coluna "permanente" ainda não existir (banco criado antes desse recurso e
      // supabase/schema.sql ainda não rerodado), não deixa isso quebrar o carregamento do app.
    }
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

  /** Edita um lançamento. Além dos campos comuns, permite trocar entre compra única,
   * parcelado e recorrente (`input.repeticao`):
   * - Se `repeticao` for omitido ou igual ao que o lançamento já tinha, é uma edição normal
   *   (o vínculo de grupo existente, se houver, é preservado como está).
   * - Se virar 'nenhuma', desvincula só este lançamento do grupo — o resto das
   *   parcelas/ocorrências continua intacto.
   * - Se virar 'parcelado'/'recorrente', este lançamento passa a ser o início de um novo
   *   grupo (novo grupoParcelamentoId/recorrenciaId), e as ocorrências seguintes são geradas
   *   a partir da data informada — o vínculo antigo (se havia um) é substituído pelo novo.
   */
  async atualizar(id: string, input: EdicaoLancamentoInput): Promise<void> {
    const atual = this.lancamentos().find((l) => l.id === id);
    const jaEraPago = atual?.status === 'pago';
    const repeticaoAtual: 'nenhuma' | 'parcelado' | 'recorrente' = atual?.recorrenciaId
      ? 'recorrente'
      : atual?.grupoParcelamentoId
        ? 'parcelado'
        : 'nenhuma';
    const repeticaoDesejada = input.repeticao ?? repeticaoAtual;

    const camposComuns = {
      tipo: input.tipo,
      descricao: input.descricao,
      valor: input.valor,
      status: input.status,
      dataPagamento: input.status === 'pago' ? (jaEraPago ? atual?.dataPagamento : new Date().toISOString()) : null,
      categoriaId: input.categoriaId || null,
      contaId: input.contaId || null,
      cartaoId: input.cartaoId || null,
      responsavelId: input.responsavelId || null,
      observacao: input.observacao || null,
    };

    if (repeticaoDesejada === repeticaoAtual) {
      await this.dbService.db
        .update(lancamento)
        .set({ ...camposComuns, data: input.data.toISOString(), vencimento: input.data.toISOString() })
        .where(eq(lancamento.id, id));
    } else if (repeticaoDesejada === 'nenhuma') {
      await this.dbService.db
        .update(lancamento)
        .set({
          ...camposComuns,
          data: input.data.toISOString(),
          vencimento: input.data.toISOString(),
          grupoParcelamentoId: null,
          parcelaAtual: null,
          parcelaTotal: null,
          recorrenciaId: null,
        })
        .where(eq(lancamento.id, id));
    } else if (repeticaoDesejada === 'parcelado') {
      const parcelas = gerarParcelas({
        descricao: input.descricao,
        valorParcela: input.valor,
        totalParcelas: input.quantidade ?? 2,
        parcelaInicial: input.parcelaInicial,
        dataPrimeiraParcela: input.data,
        contaId: input.contaId || undefined,
        cartaoId: input.cartaoId || undefined,
        categoriaId: input.categoriaId || undefined,
        responsavelId: input.responsavelId || undefined,
      });
      const [primeira, ...resto] = parcelas;
      await this.dbService.db
        .update(lancamento)
        .set({
          ...camposComuns,
          data: primeira.data,
          vencimento: primeira.vencimento,
          grupoParcelamentoId: primeira.grupoParcelamentoId,
          parcelaAtual: primeira.parcelaAtual,
          parcelaTotal: primeira.parcelaTotal,
          recorrenciaId: null,
        })
        .where(eq(lancamento.id, id));
      if (resto.length) await this.dbService.db.insert(lancamento).values(resto.map((p) => ({ ...p, tipo: input.tipo })));
    } else {
      const recorrenciaId = crypto.randomUUID();
      await this.dbService.db.insert(recorrencia).values({
        id: recorrenciaId,
        frequencia: 'mensal',
        diaReferencia: input.data.getDate(),
        ativa: true,
      });
      const meses = Math.max(1, input.quantidade ?? 3);
      const ocorrencias = Array.from({ length: meses }, (_, index) => {
        const data = addMonthsClamped(input.data, index).toISOString();
        return { data, vencimento: data };
      });
      const [primeira, ...resto] = ocorrencias;
      await this.dbService.db
        .update(lancamento)
        .set({
          ...camposComuns,
          data: primeira.data,
          vencimento: primeira.vencimento,
          recorrenciaId,
          grupoParcelamentoId: null,
          parcelaAtual: null,
          parcelaTotal: null,
        })
        .where(eq(lancamento.id, id));
      if (resto.length) {
        await this.dbService.db.insert(lancamento).values(
          resto.map((o) => ({
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
            data: o.data,
            vencimento: o.vencimento,
          })),
        );
      }
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

  /** Todas as parcelas do mesmo parcelamento (passadas e futuras), pra tela de detalhe. */
  async buscarGrupoParcelamento(grupoParcelamentoId: string): Promise<Lancamento[]> {
    return this.dbService.db
      .select()
      .from(lancamento)
      .where(and(eq(lancamento.grupoParcelamentoId, grupoParcelamentoId), isNull(lancamento.deletedAt)))
      .orderBy(lancamento.data);
  }

  /** Todas as ocorrências da mesma recorrência (passadas e futuras), pra tela de detalhe. */
  async buscarRecorrencia(recorrenciaId: string): Promise<Lancamento[]> {
    return this.dbService.db
      .select()
      .from(lancamento)
      .where(and(eq(lancamento.recorrenciaId, recorrenciaId), isNull(lancamento.deletedAt)))
      .orderBy(lancamento.data);
  }

  /** A regra (ativa/permanente) por trás de uma recorrência, pra tela de detalhe. */
  async buscarRecorrenciaInfo(recorrenciaId: string): Promise<{ ativa: boolean; permanente: boolean } | undefined> {
    const [info] = await this.dbService.db.select().from(recorrencia).where(eq(recorrencia.id, recorrenciaId));
    return info;
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

/** Diferença aproximada em meses (só olha mês/ano, ignora o dia) entre duas datas. */
function mesesEntre(de: Date, ate: Date): number {
  return (ate.getFullYear() - de.getFullYear()) * 12 + (ate.getMonth() - de.getMonth());
}
