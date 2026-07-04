import { projetarOcorrencias, proximoMes } from './recorrencia';

describe('projetarOcorrencias', () => {
  it('projeta a ocorrência mensal de uma conta fixa no mês seguinte automaticamente', () => {
    const regra = {
      frequencia: 'mensal' as const,
      diaReferencia: 15,
      dataInicio: new Date(2025, 0, 15),
      ativa: true,
    };

    const fevereiro = projetarOcorrencias(regra, { mes: 1, ano: 2025 });
    expect(fevereiro.length).toBe(1);
    expect(fevereiro[0].getDate()).toBe(15);
    expect(fevereiro[0].getMonth()).toBe(1);
  });

  it('não projeta ocorrências antes do mês de início da regra', () => {
    const regra = {
      frequencia: 'mensal' as const,
      diaReferencia: 10,
      dataInicio: new Date(2025, 5, 10),
      ativa: true,
    };
    expect(projetarOcorrencias(regra, { mes: 2, ano: 2025 })).toEqual([]);
  });

  it('não projeta nada quando a recorrência está inativa', () => {
    const regra = {
      frequencia: 'mensal' as const,
      diaReferencia: 10,
      dataInicio: new Date(2025, 0, 1),
      ativa: false,
    };
    expect(projetarOcorrencias(regra, { mes: 3, ano: 2025 })).toEqual([]);
  });

  it('ajusta o dia em meses mais curtos (dia 31 em fevereiro)', () => {
    const regra = {
      frequencia: 'mensal' as const,
      diaReferencia: 31,
      dataInicio: new Date(2025, 0, 31),
      ativa: true,
    };
    const fevereiro = projetarOcorrencias(regra, { mes: 1, ano: 2025 });
    expect(fevereiro[0].getDate()).toBe(28);
  });
});

describe('proximoMes', () => {
  it('vira o ano ao passar de dezembro', () => {
    expect(proximoMes({ mes: 11, ano: 2025 })).toEqual({ mes: 0, ano: 2026 });
  });
});
