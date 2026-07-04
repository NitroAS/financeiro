import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { conta } from './conta';
import { cartao } from './cartao';
import { categoria } from './categoria';
import { responsavel } from './responsavel';
import { recorrencia } from './recorrencia';

/**
 * Parcelamentos são materializados por completo na criação: cadastrar uma compra em
 * N vezes gera as N linhas aqui (mesmo grupoParcelamentoId), cada uma já com o mês
 * correto — por isso o mês seguinte sempre mostra a parcela certa (ex.: 1/10 em
 * Janeiro já existe como 2/10 em Fevereiro) sem nenhum cálculo em tempo de leitura.
 * Recorrências (contas fixas indefinidas) não são materializadas com antecedência:
 * são projetadas sob demanda (ver shared/utils/recorrencia.ts) e só viram uma linha
 * real aqui quando o mês projetado é visualizado ou a ocorrência é paga.
 */
export const lancamento = sqliteTable('lancamento', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  tipo: text('tipo', { enum: ['receita', 'despesa'] }).notNull(),
  descricao: text('descricao').notNull(),
  valor: real('valor').notNull(),
  data: text('data').notNull(),
  vencimento: text('vencimento'),
  dataPagamento: text('data_pagamento'),
  status: text('status', { enum: ['pendente', 'pago', 'atrasado'] })
    .notNull()
    .default('pendente'),
  contaId: text('conta_id').references(() => conta.id),
  cartaoId: text('cartao_id').references(() => cartao.id),
  categoriaId: text('categoria_id').references(() => categoria.id),
  responsavelId: text('responsavel_id').references(() => responsavel.id),
  formaPagamento: text('forma_pagamento'),
  observacao: text('observacao'),
  favorito: integer('favorito', { mode: 'boolean' }).notNull().default(false),
  deletedAt: text('deleted_at'),
  grupoParcelamentoId: text('grupo_parcelamento_id'),
  parcelaAtual: integer('parcela_atual'),
  parcelaTotal: integer('parcela_total'),
  recorrenciaId: text('recorrencia_id').references(() => recorrencia.id),
  origemImportacao: text('origem_importacao'),
  criadoEm: text('criado_em').$defaultFn(() => new Date().toISOString()),
  atualizadoEm: text('atualizado_em'),
});
