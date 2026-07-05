const MESES = {
  JANEIRO: 0, FEVEREIRO: 1, MARCO: 2, MARÇO: 2, ABRIL: 3, MAIO: 4, JUNHO: 5,
  JULHO: 6, AGOSTO: 7, SETEMBRO: 8, OUTUBRO: 9, NOVEMBRO: 10, DEZEMBRO: 11,
};

export function parseNomeAba(nomeAba) {
  const limpo = nomeAba.trim().toUpperCase().replace(/\s+/g, ' ');
  const match = limpo.match(/^([A-ZÇÃ]+)[.\s]+(\d{2})$/);
  if (!match) return null;
  const mes = MESES[match[1]];
  if (mes === undefined) return null;
  return { mes, ano: 2000 + Number(match[2]) };
}

function textoCelula(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString();
  return String(v).trim();
}

function numeroCelula(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Interpreta a coluna "parcela": fração N/M, data de compra, "recorrente"/"único"/"indefinido". */
function interpretarParcela(v) {
  if (v instanceof Date) return { tipo: 'data', data: v };
  const s = textoCelula(v).toLowerCase();
  const fracao = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fracao) return { tipo: 'fracao', atual: Number(fracao[1]), total: Number(fracao[2]) };
  if (/recorrente/.test(s)) return { tipo: 'recorrente' };
  if (/unic[oa]|único|única/.test(s)) return { tipo: 'unico' };
  return { tipo: 'indefinido', bruto: s };
}

export function diaClamped(ano, mes, dia) {
  if (!dia || dia < 1) return null;
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();
  return new Date(ano, mes, Math.min(Math.floor(dia), ultimoDia)).toISOString();
}

/** "2.841,58" / "2591,44" (formato BR) -> 2841.58 / 2591.44 */
function parseValorBR(s) {
  const limpo = s.replace(/[^\d.,]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

/** O cabeçalho do bloco às vezes traz o salário da pessoa embutido no texto (única fonte de receita da planilha). */
function extrairSalario(textoBloco) {
  const match = textoBloco.match(/s[áa]lario\s*([\d.,]+)/i);
  return match ? parseValorBR(match[1]) : null;
}

/** Acha, numa linha, todas as colunas onde a célula é exatamente "NOME" (cabeçalho de cada bloco). */
function acharColunasNome(linha) {
  const colunas = [];
  linha.forEach((v, idx) => {
    if (textoCelula(v).toUpperCase() === 'NOME') colunas.push(idx);
  });
  return colunas;
}

/**
 * Varre uma aba mensal e extrai todos os blocos "CONTROLE DE GASTOS MENSAIS - <PESSOA>",
 * cada um com as tabelas Contas Rotativas (cartão) e Contas Fixas (pix/boleto). As colunas
 * de cada bloco são localizadas dinamicamente a partir do cabeçalho "NOME" daquela linha
 * (o layout desliza de coluna dependendo da aba, então índices fixos não são confiáveis).
 */
export function parseAbaMensal(linhas, mes, ano) {
  const entradas = [];
  const salarios = [];
  let i = 0;
  while (i < linhas.length) {
    const linhaAtual = linhas[i] ?? [];
    const temCabecalhoBloco = linhaAtual.some((v) => /CONTROLE DE GASTOS/i.test(textoCelula(v)));
    if (temCabecalhoBloco) {
      const textoBloco = linhaAtual.map(textoCelula).find((t) => /CONTROLE DE GASTOS/i.test(t)) ?? '';
      const match = textoBloco.match(/-\s*([A-ZÀ-Ú]+)/i);
      const pessoa = match ? match[1].toUpperCase() : 'DESCONHECIDO';

      const salario = extrairSalario(textoBloco);
      if (salario) salarios.push({ pessoa, valor: salario, mes, ano });

      let j = i + 1;
      let colunasNome = [];
      while (j < linhas.length && j - i < 6) {
        colunasNome = acharColunasNome(linhas[j] ?? []);
        if (colunasNome.length) break;
        j++;
      }
      if (!colunasNome.length) {
        i++;
        continue;
      }
      j++; // pula a linha de cabeçalho

      // Descobre qual coluna-âncora é a de rotativas (tem "DATA FECHA." logo depois) e qual é fixas.
      const linhaCabecalho = linhas[j - 1] ?? [];
      let colRotativas = null;
      let colFixas = null;
      for (const col of colunasNome) {
        const rotuloFechamento = textoCelula(linhaCabecalho[col + 5]).toUpperCase();
        if (rotuloFechamento.includes('FECHA')) colRotativas = col;
        else colFixas = col;
      }

      while (j < linhas.length) {
        const linha = linhas[j] ?? [];
        const paraTexto = (idx) => textoCelula(linha[idx]);
        if (linha.some((v) => /Total Geral/i.test(textoCelula(v)))) break;

        if (colRotativas !== null) {
          const c = colRotativas;
          const valor = numeroCelula(linha[c + 4]);
          if (paraTexto(c) && valor !== null) {
            entradas.push({
              pessoa,
              tipoConta: 'rotativa',
              origem: paraTexto(c + 2) || 'Outros',
              descricao: paraTexto(c + 1) || '(sem descrição)',
              parcela: interpretarParcela(linha[c + 3]),
              valor,
              diaFechamento: numeroCelula(linha[c + 5]),
              diaVencimento: numeroCelula(linha[c + 6]),
              vencimento: diaClamped(ano, mes, numeroCelula(linha[c + 6])) ?? diaClamped(ano, mes, 15),
              quitado: /sim/i.test(paraTexto(c + 7)),
              mes,
              ano,
            });
          }
        }

        if (colFixas !== null) {
          const c = colFixas;
          const valor = numeroCelula(linha[c + 4]);
          if (paraTexto(c) && valor !== null) {
            entradas.push({
              pessoa,
              tipoConta: 'fixa',
              formaPagamento: paraTexto(c),
              origem: paraTexto(c + 2) || '',
              descricao: paraTexto(c + 1) || '(sem descrição)',
              parcela: interpretarParcela(linha[c + 3]),
              valor,
              diaVencimento: numeroCelula(linha[c + 5]),
              vencimento: diaClamped(ano, mes, numeroCelula(linha[c + 5])) ?? diaClamped(ano, mes, 10),
              quitado: /sim/i.test(paraTexto(c + 6)),
              mes,
              ano,
            });
          }
        }

        j++;
      }
      i = j;
    } else {
      i++;
    }
  }
  return { entradas, salarios };
}

const MARCADORES_FINAIS = ['total geral', 'total com taxas e frete'];

/**
 * Varre TODAS as abas (inclusive as especiais) atrás de blocos soltos de compras de
 * colecionáveis ("Commander AS", cards avulsos...). Esses blocos são copiados de mês a mês
 * ao duplicar a aba — os mesmos valores aparecem repetidos dezenas de vezes — então cada
 * valor único é importado uma única vez (na primeira aba em que aparece), não uma vez por mês.
 */
export function extrairTotaisSoltos(wb, XLSX) {
  const vistos = new Set();
  const resultado = [];

  for (const nomeAba of wb.SheetNames) {
    const linhas = XLSX.utils.sheet_to_json(wb.Sheets[nomeAba], { header: 1, defval: null });
    const refMes = parseNomeAba(nomeAba);

    linhas.forEach((linha) => {
      linha.forEach((v, j) => {
        const rotulo = textoCelula(v).toLowerCase();
        if (!MARCADORES_FINAIS.includes(rotulo)) return;
        let valor = null;
        for (let k = j + 1; k < linha.length; k++) {
          if (typeof linha[k] === 'number') {
            valor = linha[k];
            break;
          }
        }
        if (valor === null || valor <= 0) return;
        const chave = Math.round(valor * 100);
        if (vistos.has(chave)) return;
        vistos.add(chave);
        resultado.push({
          valor,
          mes: refMes?.mes ?? null,
          ano: refMes?.ano ?? null,
          origemAba: nomeAba,
        });
      });
    });
  }

  return resultado;
}
