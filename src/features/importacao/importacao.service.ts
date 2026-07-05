import { Injectable, inject } from '@angular/core';
import type * as XLSXType from 'xlsx';
import { DbService } from '../../core/db/db.service';
import { cartao, lancamento } from '../../core/db/schema';
import { parseNomeAba, parseAbaMensal, extrairTotaisSoltos, diaClamped, type EntradaPlanilha } from '../../shared/xlsx-import/parse-mes';
import { categorizar } from '../../shared/xlsx-import/categorizar';

const ABAS_ESPECIAIS = new Set(['Viagem SP', 'Cart. Mami Agosto 25']);

// Algumas abas escrevem o nome completo em vez do apelido de sempre — mesma pessoa, chave diferente.
const PESSOA_PARA_RESPONSAVEL: Record<string, string> = {
  AS: 'resp-as',
  ALEXSANDRO: 'resp-as',
  CLEUSA: 'resp-cleusa',
  ALEX: 'resp-alex',
  NYKOLLY: 'resp-nykolly',
};

const CORES = ['#6C4CE0', '#2AA9A0', '#E0A03C', '#E05A97', '#3C9FE0', '#E05A5A'];

export interface ResumoImportacao {
  totalLido: number;
  lancamentosNovos: number;
  lancamentosJaExistentes: number;
  receitasSalario: number;
  hobbySoltos: number;
  cartoesNovos: number;
  semResponsavel: number;
  erro?: string;
}

function normalizar(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

// A coluna "ORIGEM" da planilha é texto livre — mistura bancos/cartões reais (itau, nubank,
// inter...) com anotações que não são cartão nenhum (cofre/reserva de dinheiro, pix, máquina de
// cartão, ou só as iniciais da pessoa). Só vira um cartão de verdade no app quando reconhecemos
// um nome de banco/cartão conhecido — o resto vira apenas uma nota na observação do lançamento.
const ORIGEM_NAO_CARTAO = /\b(pix|cofre|reserva|maquina|máquina|outros)\b/i;
const ORIGEM_CARTAO_CONHECIDO = /itau|itaú|inter|nubank|\bnu\b|caixa|magalu|ponto|bradesco|santander|\bc6\b|picpay|credicard/i;

function pareceCartaoReal(origemNormalizado: string): boolean {
  if (!origemNormalizado || ORIGEM_NAO_CARTAO.test(origemNormalizado)) return false;
  return ORIGEM_CARTAO_CONHECIDO.test(origemNormalizado);
}

function adivinharBanco(origem: string): string {
  const o = origem.toLowerCase();
  if (o.includes('nubank') || o.includes('nu ')) return 'Nubank';
  if (o.includes('inter')) return 'Inter';
  if (o.includes('itau') || o.includes('itaú')) return 'Itaú';
  if (o.includes('caixa')) return 'Caixa';
  if (o.includes('magalu')) return 'Magalu';
  return origem || 'Outro';
}

function moda(numeros: (number | null | undefined)[]): number | null {
  const validos = numeros.filter((n): n is number => n !== null && n !== undefined);
  if (!validos.length) return null;
  const contagem = new Map<number, number>();
  for (const n of validos) contagem.set(n, (contagem.get(n) ?? 0) + 1);
  return [...contagem.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

@Injectable({ providedIn: 'root' })
export class ImportacaoService {
  private readonly dbService = inject(DbService);

  async importar(file: File): Promise<ResumoImportacao> {
    let wb: XLSXType.WorkBook;
    let XLSX: typeof XLSXType;
    try {
      // import dinâmico: o xlsx (SheetJS) é pesado e só deve entrar no bundle quando
      // o usuário realmente clica em importar, não no carregamento inicial do app.
      XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      wb = XLSX.read(buffer, { type: 'array', cellDates: true });
    } catch {
      return {
        totalLido: 0,
        lancamentosNovos: 0,
        lancamentosJaExistentes: 0,
        receitasSalario: 0,
        hobbySoltos: 0,
        cartoesNovos: 0,
        semResponsavel: 0,
        erro: 'Não consegui ler esse arquivo. Confira se é o .xlsx exportado da sua planilha.',
      };
    }

    const entradas: EntradaPlanilha[] = [];
    const salarios: { pessoa: string; valor: number; mes: number; ano: number }[] = [];
    for (const nomeAba of wb.SheetNames) {
      if (ABAS_ESPECIAIS.has(nomeAba)) continue;
      const refMes = parseNomeAba(nomeAba);
      if (!refMes) continue;
      const linhas = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[nomeAba], { header: 1, defval: null });
      const resultado = parseAbaMensal(linhas, refMes.mes, refMes.ano);
      entradas.push(...resultado.entradas);
      salarios.push(...resultado.salarios);
    }
    const totaisSoltos = extrairTotaisSoltos(wb, XLSX.utils);

    const db = this.dbService.db;

    // Idempotência: não duplica lançamentos já importados antes (mesma origem).
    const existentes = await db.select({ origemImportacao: lancamento.origemImportacao }).from(lancamento);
    const jaImportados = new Set(existentes.map((e) => e.origemImportacao).filter((o): o is string => !!o));

    // Cartões: reaproveita os que já existem pelo nome, cria só os que faltam.
    const cartoesExistentes = await db.select().from(cartao);
    const cartaoIdPorChave = new Map(cartoesExistentes.map((c) => [normalizar(c.nome), c.id]));

    const cartoesPorChave = new Map<
      string,
      { origensRaw: string[]; fechamentos: (number | null | undefined)[]; vencimentos: (number | null | undefined)[]; pessoas: Set<string> }
    >();
    for (const e of entradas.filter((e) => e.tipoConta === 'rotativa' && pareceCartaoReal(normalizar(e.origem)))) {
      const chave = normalizar(e.origem);
      if (cartaoIdPorChave.has(chave)) continue;
      if (!cartoesPorChave.has(chave)) {
        cartoesPorChave.set(chave, { origensRaw: [], fechamentos: [], vencimentos: [], pessoas: new Set() });
      }
      const c = cartoesPorChave.get(chave)!;
      c.origensRaw.push(e.origem);
      c.fechamentos.push(e.diaFechamento);
      c.vencimentos.push(e.diaVencimento);
      c.pessoas.add(e.pessoa);
    }

    const novosCartoes: (typeof cartao.$inferInsert)[] = [];
    let corIdx = 0;
    for (const [chave, info] of cartoesPorChave) {
      const id = crypto.randomUUID();
      cartaoIdPorChave.set(chave, id);
      const pessoaUnica = info.pessoas.size === 1 ? [...info.pessoas][0] : null;
      novosCartoes.push({
        id,
        nome: info.origensRaw[0],
        banco: adivinharBanco(info.origensRaw[0]),
        bandeira: 'Outra',
        limite: 1000,
        diaFechamento: moda(info.fechamentos) ?? 5,
        diaVencimento: moda(info.vencimentos) ?? 15,
        responsavelId: pessoaUnica ? (PESSOA_PARA_RESPONSAVEL[pessoaUnica] ?? null) : null,
        cor: CORES[corIdx++ % CORES.length],
        icone: 'credit-card',
      });
    }
    if (novosCartoes.length) await db.insert(cartao).values(novosCartoes);

    const novosLancamentos: (typeof lancamento.$inferInsert)[] = [];
    let semResponsavel = 0;

    for (const e of entradas) {
      const origemImportacao = `xlsx:${e.mes + 1}/${e.ano}:${e.pessoa}:${e.tipoConta}:${normalizar(e.descricao)}:${e.valor}`;
      if (jaImportados.has(origemImportacao)) continue;

      const responsavelId = PESSOA_PARA_RESPONSAVEL[e.pessoa] ?? null;
      if (!responsavelId) semResponsavel++;

      const dataIso = e.vencimento;
      const origemEhCartao = e.tipoConta === 'rotativa' && pareceCartaoReal(normalizar(e.origem));
      novosLancamentos.push({
        tipo: 'despesa',
        descricao: e.descricao,
        valor: e.valor,
        data: dataIso ?? new Date().toISOString(),
        vencimento: dataIso,
        dataPagamento: e.quitado ? dataIso : null,
        status: e.quitado ? 'pago' : 'pendente',
        cartaoId: origemEhCartao ? cartaoIdPorChave.get(normalizar(e.origem)) : undefined,
        categoriaId: categorizar(e.descricao, 'despesa'),
        responsavelId: responsavelId ?? undefined,
        formaPagamento: e.tipoConta === 'fixa' ? e.formaPagamento || e.origem : undefined,
        observacao: (e.tipoConta === 'fixa' || !origemEhCartao) && e.origem ? `Origem: ${e.origem}` : undefined,
        parcelaAtual: e.parcela.tipo === 'fracao' ? e.parcela.atual : undefined,
        parcelaTotal: e.parcela.tipo === 'fracao' ? e.parcela.total : undefined,
        origemImportacao,
      });
    }

    let receitasSalario = 0;
    for (const s of salarios) {
      const origemImportacao = `xlsx:${s.mes + 1}/${s.ano}:${s.pessoa}:salario`;
      if (jaImportados.has(origemImportacao)) continue;
      const dataIso = diaClamped(s.ano, s.mes, 5)!;
      novosLancamentos.push({
        tipo: 'receita',
        descricao: `Salário${s.pessoa ? ' - ' + s.pessoa : ''}`,
        valor: s.valor,
        data: dataIso,
        vencimento: dataIso,
        dataPagamento: dataIso,
        status: 'pago',
        categoriaId: 'cat-salario',
        responsavelId: PESSOA_PARA_RESPONSAVEL[s.pessoa] ?? undefined,
        origemImportacao,
      });
      receitasSalario++;
    }

    let hobbySoltos = 0;
    for (const t of totaisSoltos) {
      const origemImportacao = `xlsx:solto:${t.origemAba}:${t.valor}`;
      if (jaImportados.has(origemImportacao)) continue;
      const dataIso = t.mes !== null && t.ano !== null ? (diaClamped(t.ano, t.mes, 15) ?? new Date().toISOString()) : new Date().toISOString();
      novosLancamentos.push({
        tipo: 'despesa',
        descricao: 'Compra de cards/colecionáveis',
        valor: t.valor,
        data: dataIso,
        vencimento: dataIso,
        status: 'pendente',
        categoriaId: 'cat-hobby',
        observacao: `Valor consolidado de uma nota solta que se repetia em várias abas da planilha (ex.: ${t.origemAba}) — revise a data e o responsável.`,
        origemImportacao,
      });
      hobbySoltos++;
    }

    if (novosLancamentos.length) await db.insert(lancamento).values(novosLancamentos);

    return {
      totalLido: entradas.length + salarios.length + totaisSoltos.length,
      lancamentosNovos: novosLancamentos.length,
      lancamentosJaExistentes: entradas.length + salarios.length + totaisSoltos.length - novosLancamentos.length,
      receitasSalario,
      hobbySoltos,
      cartoesNovos: novosCartoes.length,
      semResponsavel,
    };
  }
}
