import { Component, inject, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ButtonDirective } from '../../shared/ui/button.directive';
import { ImportacaoService, type ResumoImportacao } from './importacao.service';

@Component({
  selector: 'app-importar-planilha',
  standalone: true,
  imports: [LucideAngularModule, ButtonDirective],
  template: `
    <button
      appButton
      variant="ghost"
      size="icon"
      type="button"
      (click)="arquivo.click()"
      aria-label="Importar planilha xlsx"
      title="Importar planilha (.xlsx)"
      [disabled]="carregando()"
    >
      <lucide-angular name="file-spreadsheet" [size]="16" [class]="carregando() ? 'animate-pulse' : ''" />
    </button>
    <input #arquivo type="file" accept=".xlsx" class="hidden" (change)="onArquivo($event)" />

    @if (resumo() || erro()) {
      <div class="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[12vh]" (click)="fechar()">
        <div class="w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-lg" (click)="$event.stopPropagation()">
          @if (erro(); as e) {
            <div class="flex items-center gap-2 text-critical">
              <lucide-angular name="x" [size]="18" />
              <h2 class="text-sm font-semibold">Não deu certo</h2>
            </div>
            <p class="mt-2 text-sm text-muted-foreground">{{ e }}</p>
          }
          @if (resumo(); as r) {
            <div class="flex items-center gap-2 text-success">
              <lucide-angular name="check" [size]="18" />
              <h2 class="text-sm font-semibold">Importação concluída</h2>
            </div>
            <div class="mt-3 flex flex-col gap-1.5 text-sm">
              <div class="flex justify-between"><span class="text-muted-foreground">Lançamentos novos</span><span class="font-medium">{{ r.lancamentosNovos }}</span></div>
              <div class="flex justify-between"><span class="text-muted-foreground">Já importados antes (ignorados)</span><span class="font-medium">{{ r.lancamentosJaExistentes }}</span></div>
              <div class="flex justify-between"><span class="text-muted-foreground">Receitas de salário</span><span class="font-medium">{{ r.receitasSalario }}</span></div>
              <div class="flex justify-between"><span class="text-muted-foreground">Compras de colecionáveis (deduplicadas)</span><span class="font-medium">{{ r.hobbySoltos }}</span></div>
              <div class="flex justify-between"><span class="text-muted-foreground">Cartões criados</span><span class="font-medium">{{ r.cartoesNovos }}</span></div>
              @if (r.semResponsavel > 0) {
                <div class="flex justify-between text-warning"><span>Sem responsável identificado</span><span class="font-medium">{{ r.semResponsavel }}</span></div>
              }
            </div>
            <p class="mt-3 text-xs text-muted-foreground">
              Pode rodar de novo com uma versão mais atual da planilha quando quiser — o que já foi
              importado não se repete.
            </p>
          }
          <button appButton class="mt-4 w-full" type="button" (click)="fechar()">Fechar</button>
        </div>
      </div>
    }
  `,
})
export class ImportarPlanilhaComponent {
  private readonly importacaoService = inject(ImportacaoService);

  readonly carregando = signal(false);
  readonly resumo = signal<ResumoImportacao | null>(null);
  readonly erro = signal<string | null>(null);

  async onArquivo(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.carregando.set(true);
    this.erro.set(null);
    try {
      const resultado = await this.importacaoService.importar(file);
      if (resultado.erro) {
        this.erro.set(resultado.erro);
      } else {
        this.resumo.set(resultado);
      }
    } catch (e) {
      this.erro.set(e instanceof Error ? e.message : 'Erro inesperado ao importar.');
    } finally {
      this.carregando.set(false);
    }
  }

  fechar(): void {
    const importou = this.resumo() !== null && this.resumo()!.lancamentosNovos > 0;
    this.resumo.set(null);
    this.erro.set(null);
    if (importou) {
      window.location.reload();
    }
  }
}
