import { defineTable } from './table';

/**
 * Parcelamentos são materializados por completo na criação: cadastrar uma compra em
 * N vezes gera as N linhas aqui (mesmo grupoParcelamentoId), cada uma já com o mês
 * correto — por isso o mês seguinte sempre mostra a parcela certa (ex.: 1/10 em
 * Janeiro já existe como 2/10 em Fevereiro) sem nenhum cálculo em tempo de leitura.
 * Recorrências mensais (salário, aluguel...) também são materializadas com antecedência
 * (ver LancamentosService.criarRecorrente), todas ligadas pelo mesmo recorrenciaId.
 */
export interface Lancamento {
  id: string;
  tipo: 'receita' | 'despesa';
  descricao: string;
  valor: number;
  data: string;
  vencimento: string | null;
  dataPagamento: string | null;
  status: 'pendente' | 'pago' | 'atrasado';
  contaId: string | null;
  cartaoId: string | null;
  categoriaId: string | null;
  responsavelId: string | null;
  formaPagamento: string | null;
  observacao: string | null;
  favorito: boolean;
  deletedAt: string | null;
  grupoParcelamentoId: string | null;
  parcelaAtual: number | null;
  parcelaTotal: number | null;
  recorrenciaId: string | null;
  origemImportacao: string | null;
  criadoEm: string | null;
  atualizadoEm: string | null;
}

export type NovoLancamento = Partial<
  Pick<
    Lancamento,
    | 'id'
    | 'vencimento'
    | 'dataPagamento'
    | 'status'
    | 'contaId'
    | 'cartaoId'
    | 'categoriaId'
    | 'responsavelId'
    | 'formaPagamento'
    | 'observacao'
    | 'favorito'
    | 'deletedAt'
    | 'grupoParcelamentoId'
    | 'parcelaAtual'
    | 'parcelaTotal'
    | 'recorrenciaId'
    | 'origemImportacao'
    | 'criadoEm'
    | 'atualizadoEm'
  >
> &
  Pick<Lancamento, 'tipo' | 'descricao' | 'valor' | 'data'>;

export const lancamento = defineTable<Lancamento, NovoLancamento>('lancamento', {
  id: 'id',
  tipo: 'tipo',
  descricao: 'descricao',
  valor: 'valor',
  data: 'data',
  vencimento: 'vencimento',
  dataPagamento: 'data_pagamento',
  status: 'status',
  contaId: 'conta_id',
  cartaoId: 'cartao_id',
  categoriaId: 'categoria_id',
  responsavelId: 'responsavel_id',
  formaPagamento: 'forma_pagamento',
  observacao: 'observacao',
  favorito: 'favorito',
  deletedAt: 'deleted_at',
  grupoParcelamentoId: 'grupo_parcelamento_id',
  parcelaAtual: 'parcela_atual',
  parcelaTotal: 'parcela_total',
  recorrenciaId: 'recorrencia_id',
  origemImportacao: 'origem_importacao',
  criadoEm: 'criado_em',
  atualizadoEm: 'atualizado_em',
});
