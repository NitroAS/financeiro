/** Dados padrão inseridos na primeira execução — únicos usados tanto pelo bootstrap do
 * worker quanto pelas telas (para exibir nomes/cores sem precisar buscar no banco antes). */

export const RESPONSAVEIS_PADRAO = [
  { id: 'resp-as', nome: 'AS', cor: '#6C4CE0', icone: 'user' },
  { id: 'resp-cleusa', nome: 'Cleusa', cor: '#E05A97', icone: 'user' },
  { id: 'resp-alex', nome: 'Alex', cor: '#2AA9A0', icone: 'user' },
  { id: 'resp-nykolly', nome: 'Nykolly', cor: '#E0A03C', icone: 'user' },
] as const;

export const CATEGORIAS_PADRAO = [
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
] as const;

export const CONTA_ICONES = ['wallet', 'landmark', 'piggy-bank', 'banknote', 'credit-card'] as const;
export const CONTA_TIPOS = ['corrente', 'carteira', 'dinheiro', 'investimento'] as const;
export const CARTAO_BANDEIRAS = ['Visa', 'Mastercard', 'Elo', 'American Express', 'Outra'] as const;
