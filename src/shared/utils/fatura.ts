function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(ano, mes + 1, 0).getDate();
}

function diaClamped(ano: number, mes: number, dia: number): Date {
  return new Date(ano, mes, Math.min(dia, ultimoDiaDoMes(ano, mes)));
}

export interface CicloFatura {
  /** Início do ciclo (exclusivo — compras nesta data pertencem ao ciclo anterior). */
  inicio: Date;
  /** Data de fechamento deste ciclo (inclusivo). */
  fechamento: Date;
  /** Data de vencimento da fatura deste ciclo. */
  vencimento: Date;
}

/**
 * Ciclo de fatura ainda aberto na data de referência: as compras feitas até o
 * próximo fechamento (inclusive) caem nele. O vencimento é sempre a primeira
 * data de vencimento posterior ao fechamento, cobrindo tanto cartões que vencem
 * no mesmo mês do fechamento quanto os que vencem só no mês seguinte.
 */
export function cicloFaturaAberto(hoje: Date, diaFechamento: number, diaVencimento: number): CicloFatura {
  const fechamentoEsteMes = diaClamped(hoje.getFullYear(), hoje.getMonth(), diaFechamento);

  const fechamento =
    hoje <= fechamentoEsteMes ? fechamentoEsteMes : diaClamped(hoje.getFullYear(), hoje.getMonth() + 1, diaFechamento);

  const inicio = diaClamped(fechamento.getFullYear(), fechamento.getMonth() - 1, diaFechamento);

  const vencimentoMesmoMes = diaClamped(fechamento.getFullYear(), fechamento.getMonth(), diaVencimento);
  const vencimento =
    vencimentoMesmoMes > fechamento ? vencimentoMesmoMes : diaClamped(fechamento.getFullYear(), fechamento.getMonth() + 1, diaVencimento);

  return { inicio, fechamento, vencimento };
}
