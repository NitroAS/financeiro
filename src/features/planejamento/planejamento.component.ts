import { Component, OnInit, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { CardComponent } from '../../shared/ui/card.component';
import { BadgeComponent } from '../../shared/ui/badge.component';
import { ButtonDirective } from '../../shared/ui/button.directive';
import { InputDirective } from '../../shared/ui/input.directive';
import { ProgressComponent } from '../../shared/ui/progress.component';
import { addMonthsClamped } from '../../shared/utils/parcelamento';
import { PlanejamentoService, type LinhaPlanejamento } from './planejamento.service';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

@Component({
  selector: 'app-planejamento',
  standalone: true,
  imports: [FormsModule, DecimalPipe, LucideAngularModule, CardComponent, BadgeComponent, ButtonDirective, InputDirective, ProgressComponent],
  template: `
    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-semibold tracking-tight">Planejamento</h1>
        <div class="flex items-center gap-1">
          <button appButton variant="ghost" size="icon" type="button" (click)="mesAnterior()" aria-label="Mês anterior">
            <lucide-angular name="chevron-left" [size]="16" />
          </button>
          <app-badge variant="primary">{{ labelMes() }}</app-badge>
          <button appButton variant="ghost" size="icon" type="button" (click)="proximoMes()" aria-label="Próximo mês">
            <lucide-angular name="chevron-right" [size]="16" />
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
        @for (l of planejamentoService.linhas(); track l.categoriaId) {
          <app-card class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="h-2.5 w-2.5 rounded-full" [style.background]="l.categoriaCor"></span>
                <span class="text-sm font-medium">{{ l.categoriaNome }}</span>
              </div>
              @if (l.valorPlanejado > 0) {
                <app-badge [variant]="l.valorGasto > l.valorPlanejado ? 'critical' : 'success'">
                  {{ ((l.valorGasto / l.valorPlanejado) * 100) | number: '1.0-0' }}%
                </app-badge>
              }
            </div>

            <app-progress [value]="l.valorGasto" [max]="l.valorPlanejado || 1" />

            <div class="flex items-center justify-between text-xs text-muted-foreground">
              <span>Gasto: {{ l.valorGasto | number: '1.2-2' }}</span>
              <div class="flex items-center gap-1.5">
                <span>Orçamento:</span>
                <input
                  appInput
                  type="number"
                  step="0.01"
                  class="h-7 w-24 text-xs"
                  [ngModel]="l.valorPlanejado"
                  (change)="definir(l, $event)"
                />
              </div>
            </div>
          </app-card>
        } @empty {
          <app-card class="text-sm text-muted-foreground">Cadastre categorias de despesa para planejar o mês.</app-card>
        }
      </div>
    </div>
  `,
})
export class PlanejamentoComponent implements OnInit {
  readonly planejamentoService = inject(PlanejamentoService);

  readonly labelMes = computed(() => {
    const { mes, ano } = this.planejamentoService.mesReferencia();
    return `${MESES[mes]} ${ano}`;
  });

  ngOnInit(): void {
    void this.planejamentoService.carregar();
  }

  mesAnterior(): void {
    const { mes, ano } = this.planejamentoService.mesReferencia();
    const anterior = addMonthsClamped(new Date(ano, mes, 1), -1);
    this.planejamentoService.irParaMes(anterior.getMonth(), anterior.getFullYear());
  }

  proximoMes(): void {
    const { mes, ano } = this.planejamentoService.mesReferencia();
    const seguinte = addMonthsClamped(new Date(ano, mes, 1), 1);
    this.planejamentoService.irParaMes(seguinte.getMonth(), seguinte.getFullYear());
  }

  async definir(linha: LinhaPlanejamento, event: Event): Promise<void> {
    const valor = Number((event.target as HTMLInputElement).value) || 0;
    await this.planejamentoService.definirOrcamento(linha, valor);
  }
}
