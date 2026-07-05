// Porta em TypeScript de scripts/import-planilha/parseMes.mjs — mesma lógica, roda no
// navegador (usada pela importação em 1 clique) e também poderia ser reaproveitada pelo
// script de linha de comando no futuro caso os dois precisem convergir.
import type { WorkBook } from 'xlsx';

const MESES: Record<string, number> = {
  JANEIRO: 0, FEVEREIRO: 1, MARCO: 2, MARÇO: 2, ABRIL: 3, MAIO: 4, JUNHO: 5,
  JULHO: 6, AGOSTO: 7, SETEMBRO: 8, OUTUBRO: 9, NOVEMBRO: 10, DEZEMBRO: 11,
};

export interface RefMes {
  mes: number;
  ano: number;
}

export function parseNomeAba(nomeAba: string): RefMes | null {
  const limpo = nomeAba.trim().toUpperCase().replace(/\s+/g, ' ');
  const match = limpo.match(/^([A-ZÇÃ]+)[.\s]+(\d{2})$/);
  if (!match) return null;
  const mes = MESES[match[1]];
  if (mes === undefined) return null;
  return { mes, ano: 2000 + Number(match[2]) };
}

function textoCelula(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString();
  return String(v).trim();
}

function numeroCelula(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export type Parcela =
  | { tipo: 'data'; data: Date }
  | { tipo: 'fracao'; atual: number; total: number }
  | { tipo: 'recorrente' }
  | { tipo: 'unico' }
  | { tipo: 'indefinido'; bruto: string };

function interpretarParcela(v: unknown): Parcela {
  if (v instanceof Date) return { tipo: 'data', data: v };
  const s = textoCelula(v).toLowerCase();
  const fracao = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fracao) return { tipo: 'fracao', atual: Number(fracao[1]), total: Number(fracao[2]) };
  if (/recorrente/.test(s)) return { tipo: 'recorrente' };
  if (/unic[oa]|único|única/.test(s)) return { tipo: 'unico' };
  return { tipo: 'indefinido', bruto: s };
}

export function diaClamped(ano: number, mes: number, dia: number | null): string | null {
  if (!dia || dia < 1) return null;
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();
  return new Date(ano, mes, Math.min(Math.floor(dia), ultimoDia)).toISOString();
}

function parseValorBR(s: string): number | null {
  const limpo = s
    .replace(/[^\d.,]/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.');
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

function extrairSalario(textoBloco: string): number | null {
  const match = textoBloco.match(/s[áa]lario\s*([\d.,]+)/i);
  return match ? parseValorBR(match[1]) : null;
}

function acharColunasNome(linha: unknown[]): number[] {
  const colunas: number[] = [];
  linha.forEach((v, idx) => {
    if (textoCelula(v).toUpperCase() === 'NOME') colunas.push(idx);
  });
  return colunas;
}

export interface EntradaPlanilha {
  pessoa: string;
  tipoConta: 'rotativa' | 'fixa';
  origem: string;
  descricao: string;
  parcela: Parcela;
  valor: number;
  diaFechamento?: number | null;
  diaVencimento: number | null;
  vencimento: string | null;
  quitado: boolean;
  formaPagamento?: string;
  mes: number;
  ano: number;
}

export interface Salario {
  pessoa: string;
  valor: number;
  mes: number;
  ano: number;
}

export interface ResultadoAba {
  entradas: EntradaPlanilha[];
  salarios: Salario[];
}

/**
 * Varre uma aba mensal e extrai todos os blocos "CONTROLE DE GASTOS MENSAIS - <PESSOA>",
 * cada um com as tabelas Contas Rotativas (cartão) e Contas Fixas (pix/boleto). As colunas
 * de cada bloco são localizadas dinamicamente a partir do cabeçalho "NOME" daquela linha
 * (o layout desliza de coluna dependendo da aba, então índices fixos não são confiáveis).
 */
export function parseAbaMensal(linhas: unknown[][], mes: number, ano: number): ResultadoAba {
  const entradas: EntradaPlanilha[] = [];
  const salarios: Salario[] = [];
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
      let colunasNome: number[] = [];
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

      const linhaCabecalho = linhas[j - 1] ?? [];
      let colRotativas: number | null = null;
      let colFixas: number | null = null;
      for (const col of colunasNome) {
        const rotuloFechamento = textoCelula(linhaCabecalho[col + 5]).toUpperCase();
        if (rotuloFechamento.includes('FECHA')) colRotativas = col;
        else colFixas = col;
      }

      while (j < linhas.length) {
        const linha = linhas[j] ?? [];
        const paraTexto = (idx: number) => textoCelula(linha[idx]);
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

export interface TotalSolto {
  valor: number;
  mes: number | null;
  ano: number | null;
  origemAba: string;
}

const MARCADORES_FINAIS = ['total geral', 'total com taxas e frete'];

/**
 * Varre TODAS as abas atrás de blocos soltos de compras de colecionáveis. Esses blocos são
 * copiados de mês a mês ao duplicar a aba — os mesmos valores aparecem repetidos dezenas de
 * vezes — então cada valor único é importado uma única vez (na primeira aba em que aparece).
 */
export function extrairTotaisSoltos(wb: WorkBook, XLSXUtils: typeof import('xlsx').utils): TotalSolto[] {
  const vistos = new Set<number>();
  const resultado: TotalSolto[] = [];

  for (const nomeAba of wb.SheetNames) {
    const linhas = XLSXUtils.sheet_to_json<unknown[]>(wb.Sheets[nomeAba], { header: 1, defval: null });
    const refMes = parseNomeAba(nomeAba);

    linhas.forEach((linha) => {
      linha.forEach((v, j) => {
        const rotulo = textoCelula(v).toLowerCase();
        if (!MARCADORES_FINAIS.includes(rotulo)) return;
        let valor: number | null = null;
        for (let k = j + 1; k < linha.length; k++) {
          if (typeof linha[k] === 'number') {
            valor = linha[k] as number;
            break;
          }
        }
        if (valor === null || valor <= 0) return;
        const chave = Math.round(valor * 100);
        if (vistos.has(chave)) return;
        vistos.add(chave);
        resultado.push({ valor, mes: refMes?.mes ?? null, ano: refMes?.ano ?? null, origemAba: nomeAba });
      });
    });
  }

  return resultado;
}
