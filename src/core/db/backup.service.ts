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

@Injectable({ providedIn: 'root' })
export class BackupService {
  private readonly dbService = inject(DbService);

  /** Exporta todas as tabelas para um arquivo .json e dispara o download. */
  async exportar(): Promise<void> {
    const db = this.dbService.db;
    const dados = {} as Record<NomeTabela, unknown[]>;

    for (const nome of TABELAS) {
      dados[nome] = await db.select().from(schema[nome] as never);
    }

    const arquivo: ArquivoBackup = { versao: 1, exportadoEm: new Date().toISOString(), dados };
    const blob = new Blob([JSON.stringify(arquivo, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financeiro-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Restaura um backup: apaga tudo e reinsere os dados do arquivo. A ordem de TABELAS já é
   * "pais antes de filhos" (ex.: conta antes de lancamento) — respeita as chaves estrangeiras
   * do Postgres tanto ao apagar (filhos primeiro, por isso o .reverse()) quanto ao reinserir. */
  async restaurar(arquivo: File): Promise<void> {
    const conteudo = JSON.parse(await arquivo.text()) as ArquivoBackup;
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
