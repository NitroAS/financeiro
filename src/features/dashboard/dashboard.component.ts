import { Component, OnInit, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { CardComponent } from '../../shared/ui/card.component';
import { BadgeComponent } from '../../shared/ui/badge.component';
import { DashboardService } from './dashboard.service';
import { InvestimentosService } from '../investimentos/investimentos.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DecimalPipe, CardComponent, BadgeComponent],
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
          <div class="mb-2 flex items-center justify-between">
            <h2 class="text-sm font-semibold">Contas vencidas</h2>
            <app-badge variant="critical">{{ resumo().contasVencidas.length }}</app-badge>
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
          <div class="mb-2 flex items-center justify-between">
            <h2 class="text-sm font-semibold">Próximas contas</h2>
            <app-badge variant="warning">{{ resumo().proximasContas.length }}</app-badge>
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
      </div>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  readonly investimentosService = inject(InvestimentosService);
  readonly resumo = this.dashboardService.resumo;

  readonly patrimonioTotal = computed(() => this.resumo().saldoContas + this.investimentosService.patrimonioTotal);

  ngOnInit(): void {
    void this.dashboardService.carregar();
    void this.investimentosService.carregar();
  }
}
