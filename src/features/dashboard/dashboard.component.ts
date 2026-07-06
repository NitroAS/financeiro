import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { CardComponent } from '../../shared/ui/card.component';
import { BadgeComponent } from '../../shared/ui/badge.component';
import { ButtonDirective } from '../../shared/ui/button.directive';
import { DashboardService } from './dashboard.service';
import { InvestimentosService } from '../investimentos/investimentos.service';
import { LancamentosService, type Lancamento } from '../lancamentos/lancamentos.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DecimalPipe, CardComponent, BadgeComponent, ButtonDirective, LucideAngularModule],
  template: `
    <div class="flex flex-col gap-4">
      <h1 class="text-xl font-semibold tracking-tight">Dashboard</h1>

      <div class="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <app-card>
          <div class="text-xs text-muted-foreground">Saldo disponível</div>
          <div class="mt-1 tabular-nums text-lg font-semibold">{{ resumo().saldoContas | number: '1.2-2' }}</div>
        </app-card>
        <app-card>
          <div class="text-xs text-muted-foreground">Patrimônio total</div>
          <div class="mt-1 tabular-nums text-lg font-semibold">{{ patrimonioTotal() | number: '1.2-2' }}</div>
        </app-card>
        <app-card>
          <div class="text-xs text-muted-foreground">Receitas do mês</div>
          <div class="mt-1 tabular-nums text-lg font-semibold text-success">
            {{ resumo().receitasMes | number: '1.2-2' }}
          </div>
        </app-card>
        <app-card>
          <div class="text-xs text-muted-foreground">Despesas do mês</div>
          <div class="mt-1 tabular-nums text-lg font-semibold text-critical">
            {{ resumo().despesasMes | number: '1.2-2' }}
          </div>
        </app-card>
        <app-card>
          <div class="text-xs text-muted-foreground">Economia do mês</div>
          <div
            class="mt-1 tabular-nums text-lg font-semibold"
            [class]="resumo().economiaMes >= 0 ? 'text-success' : 'text-critical'"
          >
            {{ resumo().economiaMes | number: '1.2-2' }}
          </div>
        </app-card>
        <app-card>
          <div class="text-xs text-muted-foreground">Valor investido</div>
          <div class="mt-1 tabular-nums text-lg font-semibold">
            {{ investimentosService.patrimonioTotal | number: '1.2-2' }}
          </div>
        </app-card>
      </div>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <app-card>
          <div class="mb-2 flex items-center justify-between gap-2">
            <h2 class="flex items-center gap-2 text-sm font-semibold">
              Contas vencidas
              <app-badge variant="critical">{{ resumo().contasVencidas.length }}</app-badge>
            </h2>
            @if (resumo().contasVencidas.length > 0) {
              <button
                appButton
                variant="outline"
                size="sm"
                type="button"
                [disabled]="marcandoTodas() === 'vencidas'"
                (click)="marcarTodasComoPagas(resumo().contasVencidas, 'vencidas')"
              >
                <lucide-angular name="check" [size]="13" />
                {{ marcandoTodas() === 'vencidas' ? 'Marcando...' : 'Marcar todas como pagas' }}
              </button>
            }
          </div>
          <div class="flex flex-col gap-2">
            @for (l of resumo().contasVencidas; track l.id) {
              <div class="flex items-center justify-between text-sm">
                <span>{{ l.descricao }}</span>
                <span class="tabular-nums text-critical">{{ l.valor | number: '1.2-2' }}</span>
              </div>
            } @empty {
              <p class="text-sm text-muted-foreground">Nenhuma conta vencida. 🎉</p>
            }
          </div>
        </app-card>

        <app-card>
          <div class="mb-2 flex items-center justify-between gap-2">
            <h2 class="flex items-center gap-2 text-sm font-semibold">
              Próximas contas
              <app-badge variant="warning">{{ resumo().proximasContas.length }}</app-badge>
            </h2>
            @if (resumo().proximasContas.length > 0) {
              <button
                appButton
                variant="outline"
                size="sm"
                type="button"
                [disabled]="marcandoTodas() === 'proximas'"
                (click)="marcarTodasComoPagas(resumo().proximasContas, 'proximas')"
              >
                <lucide-angular name="check" [size]="13" />
                {{ marcandoTodas() === 'proximas' ? 'Marcando...' : 'Marcar todas como pagas' }}
              </button>
            }
          </div>
          <div class="flex flex-col gap-2">
            @for (l of resumo().proximasContas; track l.id) {
              <div class="flex items-center justify-between text-sm">
                <span>{{ l.descricao }}</span>
                <span class="tabular-nums">{{ l.valor | number: '1.2-2' }}</span>
              </div>
            } @empty {
              <p class="text-sm text-muted-foreground">Nada agendado por enquanto.</p>
            }
          </div>
        </app-card>

        <app-card class="lg:col-span-2">
          <h2 class="mb-2 text-sm font-semibold">Últimos lançamentos</h2>
          <div class="flex flex-col gap-2">
            @for (l of resumo().ultimosLancamentos; track l.id) {
              <div class="flex items-center justify-between text-sm">
                <span>{{ l.descricao }}</span>
                <span class="tabular-nums" [class]="l.tipo === 'receita' ? 'text-success' : ''">
                  {{ l.tipo === 'receita' ? '+' : '-' }}{{ l.valor | number: '1.2-2' }}
                </span>
              </div>
            } @empty {
              <p class="text-sm text-muted-foreground">Nenhum lançamento cadastrado ainda.</p>
            }
          </div>
        </app-card>

        <app-card class="lg:col-span-2">
          <h2 class="mb-2 text-sm font-semibold">Despesas do mês por responsável</h2>
          <div class="flex flex-col gap-3">
            @for (r of resumo().porResponsavel; track r.responsavelId) {
              <div class="flex flex-col gap-1">
                <div class="flex items-center justify-between text-sm">
                  <span class="flex items-center gap-1.5 font-medium">
                    <span class="h-2 w-2 rounded-full" [style.backgroundColor]="r.cor"></span>
                    {{ r.nome }}
                  </span>
                  <span class="tabular-nums text-critical">{{ r.despesas | number: '1.2-2' }}</span>
                </div>
                <div class="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    class="h-full rounded-full transition-[width] duration-300"
                    [style.width.%]="maiorDespesa() ? (r.despesas / maiorDespesa()) * 100 : 0"
                    [style.backgroundColor]="r.cor"
                  ></div>
                </div>
              </div>
            } @empty {
              <p class="text-sm text-muted-foreground">Nenhum lançamento com responsável neste mês.</p>
            }
          </div>
        </app-card>
      </div>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly lancamentosService = inject(LancamentosService);
  readonly investimentosService = inject(InvestimentosService);
  readonly resumo = this.dashboardService.resumo;

  readonly patrimonioTotal = computed(() => this.resumo().saldoContas + this.investimentosService.patrimonioTotal);
  readonly maiorDespesa = computed(() => Math.max(0, ...this.resumo().porResponsavel.map((r) => r.despesas)));
  readonly marcandoTodas = signal<false | 'vencidas' | 'proximas'>(false);

  ngOnInit(): void {
    void this.dashboardService.carregar();
    void this.investimentosService.carregar();
  }

  async marcarTodasComoPagas(lista: Lancamento[], chave: 'vencidas' | 'proximas'): Promise<void> {
    if (this.marcandoTodas() || lista.length === 0) return;
    const plural = lista.length > 1 ? `essas ${lista.length} contas` : 'essa conta';
    if (!confirm(`Marcar ${plural} como paga${lista.length > 1 ? 's' : ''}? Essa ação não pode ser desfeita em lote.`)) return;

    this.marcandoTodas.set(chave);
    try {
      for (const l of lista) {
        await this.lancamentosService.marcarPago(l.id);
      }
      await this.dashboardService.carregar();
    } finally {
      this.marcandoTodas.set(false);
    }
  }
}
