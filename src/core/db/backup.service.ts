import { Injectable, inject } from '@angular/core';
import { DbService } from './db.service';
import * as schema from './schema';

const TABELAS = [
  'responsavel',
  'conta',
  'cartao',
  'categoria',
  'etiqueta',
  'recorrencia',
  'lancamento',
  'lancamentoEtiqueta',
  'anexo',
  'historicoAlteracao',
  'orcamento',
  'meta',
  'metaMovimento',
  'investimento',
  'investimentoMovimento',
  'filtroSalvo',
] as const;

type NomeTabela = (typeof TABELAS)[number];

interface ArquivoBackup {
  versao: 1;
  exportadoEm: string;
  dados: Record<NomeTabela, unknown[]>;
}

/** Bem acima de qualquer volume real de uma família — evita que o limite padrão de 1000
 * linhas por consulta do PostgREST (API do Supabase) corte o backup pela metade em silêncio. */
const LIMITE_LINHAS_POR_TABELA = 100_000;

@Injectable({ providedIn: 'root' })
export class BackupService {
  private readonly dbService = inject(DbService);

  /** Exporta todas as tabelas para um arquivo .json e dispara o download.
   * Retorna quantas linhas foram exportadas ao todo, pra confirmar visualmente que o
   * backup não saiu vazio/incompleto. */
  async exportar(): Promise<{ nomeArquivo: string; totalLinhas: number }> {
    const db = this.dbService.db;
    const dados = {} as Record<NomeTabela, unknown[]>;
    let totalLinhas = 0;

    for (const nome of TABELAS) {
      const linhas = await db.select().from(schema[nome] as never).limit(LIMITE_LINHAS_POR_TABELA);
      dados[nome] = linhas;
      totalLinhas += linhas.length;
    }

    const arquivo: ArquivoBackup = { versao: 1, exportadoEm: new Date().toISOString(), dados };
    const nomeArquivo = `financeiro-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const blob = new Blob([JSON.stringify(arquivo, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    a.click();
    URL.revokeObjectURL(url);

    return { nomeArquivo, totalLinhas };
  }

  /** Restaura um backup: apaga tudo e reinsere os dados do arquivo. A ordem de TABELAS já é
   * "pais antes de filhos" (ex.: conta antes de lancamento) — respeita as chaves estrangeiras
   * do Postgres tanto ao apagar (filhos primeiro, por isso o .reverse()) quanto ao reinserir. */
  async restaurar(arquivo: File): Promise<void> {
    let conteudo: ArquivoBackup;
    try {
      conteudo = JSON.parse(await arquivo.text()) as ArquivoBackup;
    } catch {
      throw new Error('Arquivo inválido: não é um JSON de backup deste app.');
    }
    if (!conteudo?.dados) {
      throw new Error('Arquivo inválido: não parece ser um backup gerado por este app.');
    }
    const db = this.dbService.db;

    for (const nome of [...TABELAS].reverse()) {
      await db.delete(schema[nome] as never);
    }

    for (const nome of TABELAS) {
      const linhas = conteudo.dados[nome];
      if (linhas?.length) {
        await db.insert(schema[nome] as never).values(linhas as never);
      }
    }
  }
}
