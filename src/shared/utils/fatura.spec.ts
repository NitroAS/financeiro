import { cicloFaturaAberto } from './fatura';

describe('cicloFaturaAberto', () => {
  it('antes do fechamento: ciclo fecha neste mês', () => {
    const ciclo = cicloFaturaAberto(new Date(2026, 6, 3), 8, 15); // 03/07, fecha dia 8
    expect(ciclo.fechamento.getMonth()).toBe(6);
    expect(ciclo.fechamento.getDate()).toBe(8);
    expect(ciclo.vencimento.getMonth()).toBe(6);
    expect(ciclo.vencimento.getDate()).toBe(15);
  });

  it('depois do fechamento: ciclo fecha só no mês seguinte', () => {
    const ciclo = cicloFaturaAberto(new Date(2026, 6, 20), 8, 15); // 20/07, já fechou dia 8
    expect(ciclo.fechamento.getMonth()).toBe(7); // Agosto
    expect(ciclo.fechamento.getDate()).toBe(8);
    expect(ciclo.inicio.getMonth()).toBe(6);
    expect(ciclo.inicio.getDate()).toBe(8);
  });

  it('vencimento no mês seguinte ao fechamento quando o dia de vencimento é menor que o de fechamento', () => {
    const ciclo = cicloFaturaAberto(new Date(2026, 6, 3), 25, 5); // fecha dia 25, vence dia 5
    expect(ciclo.fechamento.getDate()).toBe(25);
    expect(ciclo.vencimento.getMonth()).toBe(7); // Agosto (mês seguinte ao fechamento de julho)
    expect(ciclo.vencimento.getDate()).toBe(5);
  });
});
