import { addMonthsClamped } from './parcelamento';

export interface RegraRecorrenciaInput {
  frequencia: 'mensal' | 'semanal' | 'anual';
  /** Dia do mês (mensal/anual) ou dia da semana 0-6 (semanal) que a conta ocorre. */
  diaReferencia: number;
  dataInicio: Date;
  ativa: boolean;
}

export interface MesReferencia {
  mes: number; // 0-11
  ano: number;
}

/**
 * Projeta as ocorrências de uma recorrência ativa dentro de um mês, sem gravar nada
 * no banco — é assim que "o mês seguinte" de uma conta fixa (Netflix, condomínio...)
 * já aparece disponível no calendário/dashboard mesmo sem o usuário ter cadastrado
 * aquele mês manualmente. A ocorrência só vira uma linha real em `lancamento` quando
 * o usuário paga ou edita aquele mês específico.
 */
export function projetarOcorrencias(regra: RegraRecorrenciaInput, referencia: MesReferencia): Date[] {
  if (!regra.ativa) return [];

  const inicioMes = new Date(referencia.ano, referencia.mes, 1);
  const inicioRegra = new Date(regra.dataInicio.getFullYear(), regra.dataInicio.getMonth(), 1);
  if (inicioMes < inicioRegra) return [];

  switch (regra.frequencia) {
    case 'mensal': {
      const diasNoMes = new Date(referencia.ano, referencia.mes + 1, 0).getDate();
      const dia = Math.min(regra.diaReferencia, diasNoMes);
      return [new Date(referencia.ano, referencia.mes, dia)];
    }
    case 'anual': {
      if (regra.dataInicio.getMonth() !== referencia.mes) return [];
      const diasNoMes = new Date(referencia.ano, referencia.mes + 1, 0).getDate();
      const dia = Math.min(regra.diaReferencia, diasNoMes);
      return [new Date(referencia.ano, referencia.mes, dia)];
    }
    case 'semanal': {
      const ocorrencias: Date[] = [];
      const diasNoMes = new Date(referencia.ano, referencia.mes + 1, 0).getDate();
      for (let dia = 1; dia <= diasNoMes; dia++) {
        const data = new Date(referencia.ano, referencia.mes, dia);
        if (data.getDay() === regra.diaReferencia) ocorrencias.push(data);
      }
      return ocorrencias;
    }
  }
}

/** Próximo mês em relação a uma referência — usado para sempre ter "o mês seguinte" pronto para navegação. */
export function proximoMes(referencia: MesReferencia): MesReferencia {
  const data = addMonthsClamped(new Date(referencia.ano, referencia.mes, 1), 1);
  return { mes: data.getMonth(), ano: data.getFullYear() };
}
