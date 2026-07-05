import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { BuscaStore } from '../../core/state/busca.store';
import { NAV_ITEMS } from '../../app/shell/nav-items';
import { BuscaService } from './busca.service';
import type { Lancamento } from '../lancamentos/lancamentos.service';

@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [DecimalPipe, LucideAngularModule],
  template: `
    @if (buscaStore.aberto()) {
      <div class="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[12vh]" (click)="buscaStore.fechar()">
        <div
          class="w-full max-w-lg overflow-hidden rounded-lg border border-border bg-card shadow-lg"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-center gap-2 border-b border-border px-3">
            <lucide-angular name="search" [size]="16" class="text-muted-foreground" />
            <input
              #campoBusca
              [value]="termo()"
              (input)="buscar(campoBusca.value)"
              placeholder="Buscar lançamentos ou ir para uma página..."
              class="h-11 w-full bg-transparent text-sm outline-none"
            />
            <kbd class="rounded border border-border px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">esc</kbd>
          </div>

          <div class="max-h-80 overflow-y-auto p-2">
            @if (paginasFiltradas().length) {
              <p class="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Páginas</p>
              @for (p of paginasFiltradas(); track p.path) {
                <button
                  type="button"
                  (click)="irPara(p.path)"
                  class="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                >
                  {{ p.label }}
                </button>
              }
            }

            @if (resultados().length) {
              <p class="mt-1 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Lançamentos
              </p>
              @for (l of resultados(); track l.id) {
                <button
                  type="button"
                  (click)="irParaLancamento()"
                  class="flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                >
                  <span class="truncate">{{ l.descricao }}</span>
                  <span class="tabular-nums text-xs text-muted-foreground">{{ l.valor | number: '1.2-2' }}</span>
                </button>
              }
            }

            @if (!paginasFiltradas().length && !resultados().length) {
              <p class="px-2 py-6 text-center text-sm text-muted-foreground">Nada encontrado.</p>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class CommandPaletteComponent {
  readonly buscaStore = inject(BuscaStore);
  private readonly buscaService = inject(BuscaService);
  private readonly router = inject(Router);

  readonly termo = signal('');
  readonly resultados = signal<Lancamento[]>([]);
  private debounce?: ReturnType<typeof setTimeout>;

  readonly paginasFiltradas = computed(() => {
    const t = this.termo().toLowerCase().trim();
    if (!t) return NAV_ITEMS;
    return NAV_ITEMS.filter((p) => p.label.toLowerCase().includes(t));
  });

  buscar(valor: string): void {
    this.termo.set(valor);
    clearTimeout(this.debounce);
    this.debounce = setTimeout(async () => {
      this.resultados.set(await this.buscaService.buscarLancamentos(valor));
    }, 150);
  }

  irPara(path: string): void {
    void this.router.navigateByUrl(path);
    this.buscaStore.fechar();
  }

  irParaLancamento(): void {
    void this.router.navigateByUrl('/lancamentos');
    this.buscaStore.fechar();
  }
}
