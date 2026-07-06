import { Component, HostListener, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { filter } from 'rxjs';

import { ThemeStore } from '../../core/state/theme.store';
import { SidebarStore } from '../../core/state/sidebar.store';
import { DbService } from '../../core/db/db.service';
import { BuscaStore } from '../../core/state/busca.store';
import { CommandPaletteComponent } from '../../features/busca/command-palette.component';
import { BackupService } from '../../core/db/backup.service';
import { ImportarPlanilhaComponent } from '../../features/importacao/importar-planilha.component';
import { AuthService } from '../../core/auth/auth.service';
import { ButtonDirective } from '../../shared/ui/button.directive';
import { NAV_ITEMS } from './nav-items';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule, CommandPaletteComponent, ImportarPlanilhaComponent, ButtonDirective],
  template: `
    <div class="flex h-screen overflow-hidden bg-background text-foreground">
      @if (menuAberto()) {
        <div class="fixed inset-0 z-30 bg-black/40 md:hidden" (click)="menuAberto.set(false)"></div>
      }

      <aside
        class="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-background transition-transform duration-200 md:static md:z-auto md:translate-x-0"
        [class]="(menuAberto() ? 'translate-x-0' : '-translate-x-full') + ' ' + (sidebar.collapsed() ? 'md:w-[68px]' : 'md:w-60')"
      >
        <div class="flex h-14 items-center gap-2 border-b border-border px-4">
          <span class="h-2.5 w-2.5 flex-none rounded-full bg-primary"></span>
          @if (!sidebar.collapsed() || menuAberto()) {
            <span class="truncate text-sm font-semibold tracking-tight">financeiro</span>
          }
          <button
            type="button"
            (click)="menuAberto.set(false)"
            aria-label="Fechar menu"
            class="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted md:hidden"
          >
            <lucide-angular name="x" [size]="16" />
          </button>
        </div>

        <nav class="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
          @for (item of navItems; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="bg-primary-soft text-primary"
              class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <lucide-angular [name]="item.icon" [size]="18" class="flex-none" />
              @if (!sidebar.collapsed() || menuAberto()) {
                <span class="truncate">{{ item.label }}</span>
              }
            </a>
          }
        </nav>

        <div class="hidden border-t border-border p-2 md:block">
          <button
            type="button"
            (click)="sidebar.toggle()"
            class="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <lucide-angular [name]="sidebar.collapsed() ? 'panel-left-open' : 'panel-left-close'" [size]="18" />
            @if (!sidebar.collapsed()) {
              <span>Recolher</span>
            }
          </button>
        </div>
      </aside>

      <div class="flex min-w-0 flex-1 flex-col">
        <header class="flex h-14 flex-none items-center justify-between gap-2 border-b border-border px-3 sm:px-6">
          <button
            type="button"
            (click)="menuAberto.set(true)"
            aria-label="Abrir menu"
            class="flex h-9 w-9 flex-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted md:hidden"
          >
            <lucide-angular name="menu" [size]="19" />
          </button>

          <button
            type="button"
            (click)="busca.abrir()"
            class="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted sm:flex-none"
          >
            <lucide-angular name="search" [size]="15" class="flex-none" />
            <span class="hidden sm:inline">Buscar...</span>
            <kbd class="ml-3 hidden rounded border border-border px-1.5 py-0.5 font-mono text-[11px] sm:inline">⌘K</kbd>
          </button>

          <div class="flex flex-none items-center gap-1 sm:gap-3">
            <span
              class="hidden items-center gap-1.5 text-xs font-medium sm:flex"
              [class]="dbStatusClass()"
              data-testid="db-status"
            >
              <span class="h-1.5 w-1.5 rounded-full" [class]="dbDotClass()"></span>
              {{ dbStatusLabel() }}
            </span>
            <span class="h-1.5 w-1.5 rounded-full sm:hidden" [class]="dbDotClass()" [attr.data-testid]="'db-status-dot'"></span>

            <app-importar-planilha />

            <button
              type="button"
              (click)="exportarBackup()"
              [disabled]="exportando()"
              aria-label="Baixar backup com todos os dados (arquivo .json)"
              title="Baixar backup com todos os dados (arquivo .json)"
              class="flex h-8 w-8 flex-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              <lucide-angular name="download" [size]="16" [class]="exportando() ? 'animate-pulse' : ''" />
            </button>

            <button
              type="button"
              (click)="arquivoRestaurar.click()"
              aria-label="Restaurar backup"
              title="Restaurar backup"
              class="flex h-8 w-8 flex-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <lucide-angular name="upload" [size]="16" />
            </button>
            <input
              #arquivoRestaurar
              type="file"
              accept="application/json"
              class="hidden"
              (change)="restaurar($event)"
            />

            <button
              type="button"
              (click)="theme.toggle()"
              aria-label="Alternar tema"
              class="flex h-8 w-8 flex-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <lucide-angular [name]="theme.theme() === 'dark' ? 'sun' : 'moon'" [size]="17" />
            </button>

            <button
              type="button"
              (click)="auth.sair()"
              aria-label="Sair"
              title="Sair"
              class="flex h-8 w-8 flex-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <lucide-angular name="log-out" [size]="16" />
            </button>
          </div>
        </header>

        <main class="flex-1 overflow-y-auto p-4 sm:p-6">
          <router-outlet />
        </main>
      </div>

      <app-command-palette />

      @if (backupResultado(); as r) {
        <div class="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[12vh]" (click)="backupResultado.set(null)">
          <div class="w-full max-w-sm rounded-lg border border-border bg-card p-5 shadow-lg" (click)="$event.stopPropagation()">
            <div class="flex items-center gap-2 text-success">
              <lucide-angular name="check" [size]="18" />
              <h2 class="text-sm font-semibold">Backup baixado</h2>
            </div>
            <p class="mt-2 text-sm text-muted-foreground">
              Arquivo <span class="font-medium text-foreground">{{ r.nomeArquivo }}</span> baixado com
              {{ r.totalLinhas }} registros ao todo. Guarde-o num lugar seguro (ex.: um drive na nuvem) —
              é ele que dá pra usar em "Restaurar backup" se precisar.
            </p>
            <button appButton class="mt-4 w-full" type="button" (click)="backupResultado.set(null)">Fechar</button>
          </div>
        </div>
      }

      @if (backupErro(); as e) {
        <div class="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[12vh]" (click)="backupErro.set(null)">
          <div class="w-full max-w-sm rounded-lg border border-border bg-card p-5 shadow-lg" (click)="$event.stopPropagation()">
            <div class="flex items-center gap-2 text-critical">
              <lucide-angular name="x" [size]="18" />
              <h2 class="text-sm font-semibold">Não deu certo</h2>
            </div>
            <p class="mt-2 text-sm text-muted-foreground">{{ e }}</p>
            <button appButton class="mt-4 w-full" type="button" (click)="backupErro.set(null)">Fechar</button>
          </div>
        </div>
      }
    </div>
  `,
})
export class ShellComponent {
  readonly theme = inject(ThemeStore);
  readonly sidebar = inject(SidebarStore);
  readonly dbService = inject(DbService);
  readonly busca = inject(BuscaStore);
  readonly backupService = inject(BackupService);
  readonly auth = inject(AuthService);
  readonly navItems = NAV_ITEMS;
  readonly menuAberto = signal(false);
  readonly exportando = signal(false);
  readonly backupResultado = signal<{ nomeArquivo: string; totalLinhas: number } | null>(null);
  readonly backupErro = signal<string | null>(null);

  constructor() {
    const router = inject(Router);
    router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => this.menuAberto.set(false));
  }

  async exportarBackup(): Promise<void> {
    this.exportando.set(true);
    try {
      const resultado = await this.backupService.exportar();
      this.backupResultado.set(resultado);
    } catch {
      this.backupErro.set('Não foi possível gerar o backup agora. Verifique sua conexão e tente de novo.');
    } finally {
      this.exportando.set(false);
    }
  }

  async restaurar(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0];
    if (!arquivo) return;
    if (confirm('Restaurar este backup vai substituir todos os dados atuais. Continuar?')) {
      try {
        await this.backupService.restaurar(arquivo);
        window.location.reload();
      } catch (erro) {
        this.backupErro.set(erro instanceof Error ? erro.message : 'Não foi possível restaurar este backup.');
      }
    }
    input.value = '';
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.busca.toggle();
      return;
    }
    if (event.key === 'Escape' && this.busca.aberto()) {
      this.busca.fechar();
    }
  }

  dbStatusLabel(): string {
    if (this.dbService.error()) return 'Banco indisponível';
    return this.dbService.isReady() ? 'Banco pronto' : 'Iniciando banco...';
  }

  dbStatusClass(): string {
    if (this.dbService.error()) return 'text-critical';
    return this.dbService.isReady() ? 'text-success' : 'text-muted-foreground';
  }

  dbDotClass(): string {
    if (this.dbService.error()) return 'bg-critical';
    return this.dbService.isReady() ? 'bg-success' : 'bg-muted-foreground animate-pulse';
  }
}
