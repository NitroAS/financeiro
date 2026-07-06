export interface NovoParcelamento {
  descricao: string;
  valorParcela: number;
  totalParcelas: number;
  /** Data (ou vencimento) da parcela `parcelaInicial` — as demais são projetadas a partir dela. */
  dataPrimeiraParcela: Date;
  /** Número da parcela que está sendo lançada agora (ex.: 3, para uma compra que já está
   * "3/12" em andamento e só passou a ser controlada aqui a partir daí). Default 1. */
  parcelaInicial?: number;
  contaId?: string;
  cartaoId?: string;
  categoriaId?: string;
  responsavelId?: string;
}

export interface ParcelaGerada {
  descricao: string;
  valor: number;
  data: string;
  vencimento: string;
  status: 'pendente';
  grupoParcelamentoId: string;
  parcelaAtual: number;
  parcelaTotal: number;
  contaId?: string;
  cartaoId?: string;
  categoriaId?: string;
  responsavelId?: string;
}

/** Soma meses a uma data preservando o dia, mas sem "vazar" para o mês seguinte
 * quando o mês de destino é mais curto (ex.: 31/01 + 1 mês vira 28/02, não 03/03). */
export function addMonthsClamped(date: Date, months: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDayOfTargetMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(date.getDate(), lastDayOfTargetMonth));
  return result;
}

/**
 * Gera de uma vez todas as parcelas de uma compra parcelada. Cada parcela já nasce
 * no mês certo (ex.: 1/10 cadastrada em Janeiro gera junto a 2/10 em Fevereiro, a
 * 3/10 em Março...), então o mês seguinte nunca precisa de um passo manual —
 * a parcela dele já existe no banco desde a criação da compra.
 */
export function gerarParcelas(input: NovoParcelamento): ParcelaGerada[] {
  if (input.totalParcelas < 1) {
    throw new Error('totalParcelas deve ser pelo menos 1');
  }
  const parcelaInicial = input.parcelaInicial ?? 1;
  if (parcelaInicial < 1 || parcelaInicial > input.totalParcelas) {
    throw new Error('parcelaInicial deve estar entre 1 e totalParcelas');
  }

  const grupoParcelamentoId = crypto.randomUUID();
  const quantidadeAGerar = input.totalParcelas - parcelaInicial + 1;

  return Array.from({ length: quantidadeAGerar }, (_, index) => {
    const dataParcela = addMonthsClamped(input.dataPrimeiraParcela, index).toISOString();
    return {
      descricao: input.descricao,
      valor: input.valorParcela,
      data: dataParcela,
      vencimento: dataParcela,
      status: 'pendente',
      grupoParcelamentoId,
      parcelaAtual: parcelaInicial + index,
      parcelaTotal: input.totalParcelas,
      contaId: input.contaId,
      cartaoId: input.cartaoId,
      categoriaId: input.categoriaId,
      responsavelId: input.responsavelId,
    };
  });
}
