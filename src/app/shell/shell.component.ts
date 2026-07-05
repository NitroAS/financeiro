import { Component, HostListener, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { ThemeStore } from '../../core/state/theme.store';
import { SidebarStore } from '../../core/state/sidebar.store';
import { DbService } from '../../core/db/db.service';
import { BuscaStore } from '../../core/state/busca.store';
import { CommandPaletteComponent } from '../../features/busca/command-palette.component';
import { BackupService } from '../../core/db/backup.service';
import { NAV_ITEMS } from './nav-items';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule, CommandPaletteComponent],
  template: `
    <div class="flex h-screen overflow-hidden bg-background text-foreground">
      <aside
        class="flex flex-col border-r border-border transition-[width] duration-200"
        [class]="sidebar.collapsed() ? 'w-[68px]' : 'w-60'"
      >
        <div class="flex h-14 items-center gap-2 border-b border-border px-4">
          <span class="h-2.5 w-2.5 flex-none rounded-full bg-primary"></span>
          @if (!sidebar.collapsed()) {
            <span class="truncate text-sm font-semibold tracking-tight">financeiro</span>
          }
        </div>

        <nav class="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
          @for (item of navItems; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="bg-primary-soft text-primary"
              class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <lucide-angular [name]="item.icon" [size]="18" class="flex-none" />
              @if (!sidebar.collapsed()) {
                <span class="truncate">{{ item.label }}</span>
              }
            </a>
          }
        </nav>

        <div class="border-t border-border p-2">
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
        <header class="flex h-14 flex-none items-center justify-between border-b border-border px-6">
          <button
            type="button"
            (click)="busca.abrir()"
            class="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
          >
            <lucide-angular name="search" [size]="15" />
            <span>Buscar...</span>
            <kbd class="ml-3 rounded border border-border px-1.5 py-0.5 font-mono text-[11px]">⌘K</kbd>
          </button>

          <div class="flex items-center gap-3">
            <span
              class="flex items-center gap-1.5 text-xs font-medium"
              [class]="dbStatusClass()"
              data-testid="db-status"
            >
              <span class="h-1.5 w-1.5 rounded-full" [class]="dbDotClass()"></span>
              {{ dbStatusLabel() }}
            </span>

            <button
              type="button"
              (click)="backupService.exportar()"
              aria-label="Baixar backup"
              title="Baixar backup"
              class="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <lucide-angular name="download" [size]="16" />
            </button>

            <button
              type="button"
              (click)="arquivoRestaurar.click()"
              aria-label="Restaurar backup"
              title="Restaurar backup"
              class="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
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
              class="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <lucide-angular [name]="theme.theme() === 'dark' ? 'sun' : 'moon'" [size]="17" />
            </button>
          </div>
        </header>

        <main class="flex-1 overflow-y-auto p-6">
          <router-outlet />
        </main>
      </div>

      <app-command-palette />
    </div>
  `,
})
export class ShellComponent {
  readonly theme = inject(ThemeStore);
  readonly sidebar = inject(SidebarStore);
  readonly dbService = inject(DbService);
  readonly busca = inject(BuscaStore);
  readonly backupService = inject(BackupService);
  readonly navItems = NAV_ITEMS;

  async restaurar(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0];
    if (!arquivo) return;
    if (confirm('Restaurar este backup vai substituir todos os dados atuais. Continuar?')) {
      await this.backupService.restaurar(arquivo);
      window.location.reload();
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
