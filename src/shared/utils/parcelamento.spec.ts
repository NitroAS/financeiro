import { gerarParcelas, addMonthsClamped } from './parcelamento';

describe('gerarParcelas', () => {
  it('gera a próxima parcela já ajustada para o mês seguinte (ex.: ar-condicionado 1/10 em Jan -> 2/10 em Fev)', () => {
    const parcelas = gerarParcelas({
      descricao: 'Ar-condicionado',
      valorParcela: 250,
      totalParcelas: 10,
      dataPrimeiraParcela: new Date(2025, 0, 15), // 15/01/2025
    });

    expect(parcelas.length).toBe(10);

    expect(parcelas[0].parcelaAtual).toBe(1);
    expect(parcelas[0].parcelaTotal).toBe(10);
    expect(new Date(parcelas[0].data).getMonth()).toBe(0); // Janeiro

    expect(parcelas[1].parcelaAtual).toBe(2);
    expect(parcelas[1].parcelaTotal).toBe(10);
    expect(new Date(parcelas[1].data).getMonth()).toBe(1); // Fevereiro
    expect(new Date(parcelas[1].data).getDate()).toBe(15);

    expect(parcelas[9].parcelaAtual).toBe(10);
    expect(new Date(parcelas[9].data).getMonth()).toBe(9); // Outubro

    const gruposUnicos = new Set(parcelas.map((p) => p.grupoParcelamentoId));
    expect(gruposUnicos.size).toBe(1);

    parcelas.forEach((p) => expect(p.status).toBe('pendente'));
  });

  it('mantém todas as parcelas com o mesmo valor', () => {
    const parcelas = gerarParcelas({
      descricao: 'Notebook',
      valorParcela: 300.5,
      totalParcelas: 12,
      dataPrimeiraParcela: new Date(2025, 5, 1),
    });
    expect(parcelas.every((p) => p.valor === 300.5)).toBe(true);
  });

  it('permite começar a partir de uma parcela em andamento (ex.: 3/12), gerando só as restantes', () => {
    const parcelas = gerarParcelas({
      descricao: 'Sofá',
      valorParcela: 150,
      totalParcelas: 12,
      parcelaInicial: 3,
      dataPrimeiraParcela: new Date(2025, 2, 10), // 10/03/2025 (mês da 3ª parcela)
    });

    expect(parcelas.length).toBe(10); // 3..12

    expect(parcelas[0].parcelaAtual).toBe(3);
    expect(parcelas[0].parcelaTotal).toBe(12);
    expect(new Date(parcelas[0].data).getMonth()).toBe(2); // Março

    expect(parcelas[9].parcelaAtual).toBe(12);
    expect(new Date(parcelas[9].data).getMonth()).toBe(11); // Dezembro

    const gruposUnicos = new Set(parcelas.map((p) => p.grupoParcelamentoId));
    expect(gruposUnicos.size).toBe(1);
  });

  it('rejeita parcelaInicial fora do intervalo [1, totalParcelas]', () => {
    expect(() =>
      gerarParcelas({
        descricao: 'x',
        valorParcela: 10,
        totalParcelas: 5,
        parcelaInicial: 6,
        dataPrimeiraParcela: new Date(),
      }),
    ).toThrow();
  });

  it('rejeita totalParcelas menor que 1', () => {
    expect(() =>
      gerarParcelas({
        descricao: 'x',
        valorParcela: 10,
        totalParcelas: 0,
        dataPrimeiraParcela: new Date(),
      }),
    ).toThrow();
  });
});

describe('addMonthsClamped', () => {
  it('avança um mês preservando o dia em meses "normais"', () => {
    const result = addMonthsClamped(new Date(2025, 0, 15), 1);
    expect(result.getMonth()).toBe(1);
    expect(result.getDate()).toBe(15);
  });

  it('não vaza para o mês seguinte quando o dia não existe no mês de destino (31/01 -> 28/02)', () => {
    const result = addMonthsClamped(new Date(2025, 0, 31), 1);
    expect(result.getMonth()).toBe(1); // continua em Fevereiro
    expect(result.getDate()).toBe(28); // 2025 não é bissexto
  });
});
