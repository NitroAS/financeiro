import { defineTable } from './table';

export interface Recorrencia {
  id: string;
  frequencia: 'mensal' | 'semanal' | 'anual';
  diaReferencia: number;
  ativa: boolean;
  /** Sem data pra parar: o app mantém sempre um horizonte de meses já gerados à frente
   * (ver `manterRecorrenciasPermanentes` em LancamentosService), em vez de gerar tudo de
   * uma vez — como não há como materializar "infinitas" linhas, isso simula uma recorrência
   * permanente completando o horizonte a cada carregamento do app. */
  permanente: boolean;
}

export type NovaRecorrencia = Partial<Pick<Recorrencia, 'id' | 'ativa' | 'permanente'>> &
  Pick<Recorrencia, 'frequencia' | 'diaReferencia'>;

export const recorrencia = defineTable<Recorrencia, NovaRecorrencia>('recorrencia', {
  id: 'id',
  frequencia: 'frequencia',
  diaReferencia: 'dia_referencia',
  ativa: 'ativa',
  permanente: 'permanente',
});
