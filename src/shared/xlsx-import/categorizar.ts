// Dicionário de palavras-chave -> categoria (mesmos ids de shared/constants/seed-data.ts).
const REGRAS: Array<[string, string[]]> = [
  ['cat-pet', ['gato', 'gatos', 'ração', 'racao', 'petlove', 'petshop', 'pet ', 'areia dos gatos', 'plano de saude dos gatos']],
  [
    'cat-assinaturas',
    [
      'netflix', 'prime video', 'amazon prime', 'youtube', 'spotify', 'disney', 'hbo', 'iptv', 'izt',
      'google one', 'icloud', 'tim ', 'xbox', 'rio pax', 'funeraria', 'funerária', 'anuidade',
    ],
  ],
  [
    'cat-moradia',
    [
      'condomínio', 'condominio', 'luz', 'energia', 'enel', 'light', 'gás', 'gas ', 'naturgy', 'água',
      'agua', 'internet', 'aluguel', 'iptu', 'geladeira', 'lava e seca', 'leva e seca',
    ],
  ],
  ['cat-transporte', ['uber', '99 ', 'combustível', 'combustivel', 'gasolina', 'estacionamento', 'pedagio', 'pedágio', 'passagem']],
  ['cat-saude', ['farmacia', 'farmácia', 'drogaria', 'remedio', 'remédio', 'medico', 'médico', 'plano de saude', 'plano de saúde']],
  [
    'cat-hobby',
    [
      'pokemon', 'pokémon', 'magic', 'mtg', 'yugioh', 'deck', 'booster', 'card', 'cards', 'convencao',
      'convenção', 'anime', 'geek', 'etb', 'liga pkm', 'precon', 'tcg',
    ],
  ],
  ['cat-emprestimos', ['agiota', 'emprestimo', 'empréstimo', 'financiamento']],
  ['cat-educacao', ['fiap', 'curso', 'faculdade', 'escola', 'mensalidade']],
  ['cat-lazer', ['cinema', 'ingresso', 'shopping', 'pizza', 'lanche', 'ifood', 'restaurante', 'mc ', 'mcdonalds', 'airbnb', 'bda']],
  [
    'cat-compras',
    [
      'shopee', 'shein', 'mercado livre', 'magalu', 'amazon', 'americanas', 'boticario', 'boticário',
      'colchao', 'colchão', 'webcam', 'projetor', 'monitor', 'mesa gamer', 'gaveteiro', 'penteadeira',
      'maleta', 'tenis', 'tênis', 'nike', 'vivara', 'roupa',
    ],
  ],
  ['cat-salario', ['salario', 'salário']],
];

export function categorizar(descricao: string, tipo: 'receita' | 'despesa'): string {
  const texto = (descricao || '').toLowerCase();
  for (const [categoriaId, palavras] of REGRAS) {
    if (palavras.some((p) => texto.includes(p))) return categoriaId;
  }
  return tipo === 'receita' ? 'cat-outros-receita' : 'cat-outros-despesa';
}
