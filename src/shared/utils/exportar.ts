import * as XLSX from 'xlsx';

export interface LinhaExportavel {
  Data: string;
  Descrição: string;
  Tipo: string;
  Categoria: string;
  Valor: number;
  Status: string;
}

function planilha(linhas: LinhaExportavel[]) {
  return XLSX.utils.json_to_sheet(linhas);
}

export function exportarCsv(linhas: LinhaExportavel[], nomeArquivo: string): void {
  const csv = XLSX.utils.sheet_to_csv(planilha(linhas));
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  baixar(blob, `${nomeArquivo}.csv`);
}

export function exportarExcel(linhas: LinhaExportavel[], nomeArquivo: string): void {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, planilha(linhas), 'Lançamentos');
  XLSX.writeFile(wb, `${nomeArquivo}.xlsx`);
}

function baixar(blob: Blob, nomeArquivo: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(url);
}
