#!/usr/bin/env node
// Importa o Controle_Mensal_Financeiro.xlsx original para um arquivo de backup
// (mesmo formato do botão "Baixar backup" do app) pronto para restaurar pela
// tela de Restaurar backup — não escreve direto no banco porque o banco vive
// dentro do navegador (SQLite-WASM), não é acessível por um script Node.
//
// Uso: node scripts/import-planilha/run.mjs <caminho-do-xlsx> [saida.json]
import { readFileSync, writeFileSync } from 'node:fs';
import XLSX from 'xlsx';
import { parseNomeAba, parseAbaMensal, extrairTotaisSoltos, diaClamped } from './parseMes.mjs';
import { categorizar } from './categorizar.mjs';

const [, , caminhoXlsx, caminhoSaida = 'financeiro-import.json'] = process.argv;

if (!caminhoXlsx) {
  console.error('Uso: node scripts/import-planilha/run.mjs <caminho-do-xlsx> [saida.json]');
  process.exit(1);
}

const RESPONSAVEIS_PADRAO = [
  { id: 'resp-as', nome: 'AS', cor: '#6C4CE0', icone: 'user' },
  { id: 'resp-cleusa', nome: 'Cleusa', cor: '#E05A97', icone: 'user' },
  { id: 'resp-alex', nome: 'Alex', cor: '#2AA9A0', icone: 'user' },
  { id: 'resp-nykolly', nome: 'Nykolly', cor: '#E0A03C', icone: 'user' },
];
const PESSOA_PARA_RESPONSAVEL = { AS: 'resp-as', CLEUSA: 'resp-cleusa', ALEX: 'resp-alex', NYKOLLY: 'resp-nykolly' };

const CATEGORIAS_PADRAO = [
  { id: 'cat-moradia', nome: 'Moradia', tipo: 'despesa', cor: '#6C4CE0', icone: 'home' },
  { id: 'cat-alimentacao', nome: 'Alimentação', tipo: 'despesa', cor: '#E0A03C', icone: 'utensils' },
  { id: 'cat-transporte', nome: 'Transporte', tipo: 'despesa', cor: '#2AA9A0', icone: 'car' },
  { id: 'cat-saude', nome: 'Saúde', tipo: 'despesa', cor: '#E05A5A', icone: 'heart-pulse' },
  { id: 'cat-pet', nome: 'Pet', tipo: 'despesa', cor: '#B07A3C', icone: 'paw-print' },
  { id: 'cat-assinaturas', nome: 'Assinaturas', tipo: 'despesa', cor: '#4C6FE0', icone: 'repeat' },
  { id: 'cat-hobby', nome: 'Hobby/Colecionáveis', tipo: 'despesa', cor: '#A03CE0', icone: 'gamepad-2' },
  { id: 'cat-emprestimos', nome: 'Empréstimos', tipo: 'despesa', cor: '#E05A97', icone: 'landmark' },
  { id: 'cat-compras', nome: 'Compras', tipo: 'despesa', cor: '#3C9FE0', icone: 'shopping-bag' },
  { id: 'cat-educacao', nome: 'Educação', tipo: 'despesa', cor: '#3CE0A0', icone: 'graduation-cap' },
  { id: 'cat-lazer', nome: 'Lazer', tipo: 'despesa', cor: '#E0703C', icone: 'popcorn' },
  { id: 'cat-outros-despesa', nome: 'Outros', tipo: 'despesa', cor: '#8A8698', icone: 'more-horizontal' },
  { id: 'cat-salario', nome: 'Salário', tipo: 'receita', cor: '#2AA96B', icone: 'wallet' },
  { id: 'cat-freelance', nome: 'Freelance', tipo: 'receita', cor: '#2AA9A0', icone: 'briefcase' },
  { id: 'cat-investimentos-receita', nome: 'Investimentos', tipo: 'receita', cor: '#6C4CE0', icone: 'trending-up' },
  { id: 'cat-outros-receita', nome: 'Outros', tipo: 'receita', cor: '#8A8698', icone: 'more-horizontal' },
];

const uuid = () => crypto.randomUUID();

function normalizar(s) {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function adivinharBanco(origem) {
  const o = origem.toLowerCase();
  if (o.includes('nubank') || o.includes('nu ')) return 'Nubank';
  if (o.includes('inter')) return 'Inter';
  if (o.includes('itau') || o.includes('itaú')) return 'Itaú';
  if (o.includes('caixa')) return 'Caixa';
  if (o.includes('magalu')) return 'Magalu';
  return origem || 'Outro';
}

function moda(numeros) {
  const validos = numeros.filter((n) => n !== null && n !== undefined);
  if (!validos.length) return null;
  const contagem = new Map();
  for (const n of validos) contagem.set(n, (contagem.get(n) ?? 0) + 1);
  return [...contagem.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

// --- 1. Ler planilha e extrair todas as entradas brutas ---
const wb = XLSX.readFile(caminhoXlsx, { cellDates: true });
const ABAS_ESPECIAIS = new Set(['Viagem SP', 'Cart. Mami Agosto 25']);

let entradas = [];
let salarios = [];
for (const nomeAba of wb.SheetNames) {
  if (ABAS_ESPECIAIS.has(nomeAba)) continue;
  const refMes = parseNomeAba(nomeAba);
  if (!refMes) continue;
  const linhas = XLSX.utils.sheet_to_json(wb.Sheets[nomeAba], { header: 1, defval: null });
  const resultado = parseAbaMensal(linhas, refMes.mes, refMes.ano);
  entradas.push(...resultado.entradas);
  salarios.push(...resultado.salarios);
}

const totaisSoltos = extrairTotaisSoltos(wb, XLSX);

console.log(`Lidas ${entradas.length} entradas de ${wb.SheetNames.length} abas.`);
console.log(`Salários encontrados: ${salarios.length}. Compras avulsas (deduplicadas): ${totaisSoltos.length}.`);

// --- 2. Criar cartões a partir das origens das compras rotativas ---
const cartoesPorChave = new Map();
for (const e of entradas.filter((e) => e.tipoConta === 'rotativa')) {
  const chave = normalizar(e.origem);
  if (!cartoesPorChave.has(chave)) {
    cartoesPorChave.set(chave, { origensRaw: [], fechamentos: [], vencimentos: [], pessoas: new Set() });
  }
  const c = cartoesPorChave.get(chave);
  c.origensRaw.push(e.origem);
  c.fechamentos.push(e.diaFechamento);
  c.vencimentos.push(e.diaVencimento);
  c.pessoas.add(e.pessoa);
}

const CORES = ['#6C4CE0', '#2AA9A0', '#E0A03C', '#E05A97', '#3C9FE0', '#E05A5A'];
const cartoes = [];
const idCartaoPorChave = new Map();
let corIdx = 0;
for (const [chave, info] of cartoesPorChave) {
  const id = uuid();
  idCartaoPorChave.set(chave, id);
  const pessoaUnica = info.pessoas.size === 1 ? [...info.pessoas][0] : null;
  cartoes.push({
    id,
    nome: info.origensRaw[0],
    banco: adivinharBanco(info.origensRaw[0]),
    bandeira: 'Outra',
    limite: 1000,
    diaFechamento: moda(info.fechamentos) ?? 5,
    diaVencimento: moda(info.vencimentos) ?? 15,
    contaPagamentoId: null,
    responsavelId: pessoaUnica ? (PESSOA_PARA_RESPONSAVEL[pessoaUnica] ?? null) : null,
    cor: CORES[corIdx++ % CORES.length],
    icone: 'credit-card',
  });
}

// --- 3. Montar lançamentos ---
const lancamentos = [];
let semResponsavel = 0;
let parcelasFracao = 0;

for (const e of entradas) {
  const responsavelId = PESSOA_PARA_RESPONSAVEL[e.pessoa] ?? null;
  if (!responsavelId) semResponsavel++;

  const categoriaId = categorizar(e.descricao, 'despesa');
  const dataIso = e.vencimento;

  const base = {
    id: uuid(),
    tipo: 'despesa',
    descricao: e.descricao,
    valor: e.valor,
    data: dataIso,
    vencimento: dataIso,
    dataPagamento: e.quitado ? dataIso : null,
    status: e.quitado ? 'pago' : 'pendente',
    contaId: null,
    cartaoId: e.tipoConta === 'rotativa' ? idCartaoPorChave.get(normalizar(e.origem)) : null,
    categoriaId,
    responsavelId,
    formaPagamento: e.tipoConta === 'fixa' ? e.formaPagamento || e.origem : null,
    observacao: e.tipoConta === 'fixa' && e.origem ? `Origem: ${e.origem}` : null,
    favorito: false,
    deletedAt: null,
    grupoParcelamentoId: null,
    parcelaAtual: null,
    parcelaTotal: null,
    recorrenciaId: null,
    origemImportacao: `xlsx:${e.mes + 1}/${e.ano}:${e.pessoa}:${e.tipoConta}:${normalizar(e.descricao)}:${e.valor}`,
    criadoEm: new Date().toISOString(),
    atualizadoEm: null,
  };

  if (e.parcela.tipo === 'fracao') {
    parcelasFracao++;
    base.parcelaAtual = e.parcela.atual;
    base.parcelaTotal = e.parcela.total;
  }

  lancamentos.push(base);
}

// --- 3b. Salários (única fonte de receita da planilha, embutida no texto do cabeçalho) ---
for (const s of salarios) {
  const dataIso = diaClamped(s.ano, s.mes, 5);
  lancamentos.push({
    id: uuid(),
    tipo: 'receita',
    descricao: `Salário${s.pessoa ? ' - ' + s.pessoa : ''}`,
    valor: s.valor,
    data: dataIso,
    vencimento: dataIso,
    dataPagamento: dataIso,
    status: 'pago',
    contaId: null,
    cartaoId: null,
    categoriaId: 'cat-salario',
    responsavelId: PESSOA_PARA_RESPONSAVEL[s.pessoa] ?? null,
    formaPagamento: null,
    observacao: null,
    favorito: false,
    deletedAt: null,
    grupoParcelamentoId: null,
    parcelaAtual: null,
    parcelaTotal: null,
    recorrenciaId: null,
    origemImportacao: `xlsx:${s.mes + 1}/${s.ano}:${s.pessoa}:salario`,
    criadoEm: new Date().toISOString(),
    atualizadoEm: null,
  });
}

// --- 3c. Compras avulsas de colecionáveis (blocos soltos fora das tabelas, deduplicados) ---
for (const t of totaisSoltos) {
  const dataIso = t.mes !== null ? diaClamped(t.ano, t.mes, 15) : new Date().toISOString();
  lancamentos.push({
    id: uuid(),
    tipo: 'despesa',
    descricao: 'Compra de cards/colecionáveis',
    valor: t.valor,
    data: dataIso,
    vencimento: dataIso,
    dataPagamento: null,
    status: 'pendente',
    contaId: null,
    cartaoId: null,
    categoriaId: 'cat-hobby',
    responsavelId: null,
    formaPagamento: null,
    observacao: `Valor consolidado de uma nota solta que se repetia em várias abas da planilha (ex.: ${t.origemAba}) — revise a data e o responsável.`,
    favorito: false,
    deletedAt: null,
    grupoParcelamentoId: null,
    parcelaAtual: null,
    parcelaTotal: null,
    recorrenciaId: null,
    origemImportacao: `xlsx:solto:${t.origemAba}:${t.valor}`,
    criadoEm: new Date().toISOString(),
    atualizadoEm: null,
  });
}

// --- 4. Montar arquivo de backup ---
const backup = {
  versao: 1,
  exportadoEm: new Date().toISOString(),
  dados: {
    responsavel: RESPONSAVEIS_PADRAO,
    conta: [],
    cartao: cartoes,
    categoria: CATEGORIAS_PADRAO,
    etiqueta: [],
    recorrencia: [],
    lancamento: lancamentos,
    lancamentoEtiqueta: [],
    anexo: [],
    historicoAlteracao: [],
    orcamento: [],
    meta: [],
    metaMovimento: [],
    investimento: [],
    investimentoMovimento: [],
    filtroSalvo: [],
  },
};

writeFileSync(caminhoSaida, JSON.stringify(backup, null, 2));

console.log(`\nResumo da importação:`);
console.log(`  Lançamentos: ${lancamentos.length}`);
console.log(`  Receitas (salário): ${salarios.length}`);
console.log(`  Compras avulsas de colecionáveis (deduplicadas): ${totaisSoltos.length}`);
console.log(`  Cartões criados: ${cartoes.length}`);
console.log(`  Sem responsável identificado: ${semResponsavel}`);
console.log(`  Parcelas com fração N/M preservada: ${parcelasFracao}`);
console.log(`\nArquivo gerado: ${caminhoSaida}`);
console.log(`Abra o app -> clique no ícone de upload no topo -> selecione este arquivo.`);
