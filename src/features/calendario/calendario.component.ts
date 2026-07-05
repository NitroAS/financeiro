import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { CardComponent } from '../../shared/ui/card.component';
import { BadgeComponent } from '../../shared/ui/badge.component';
import { ButtonDirective } from '../../shared/ui/button.directive';
import { addMonthsClamped } from '../../shared/utils/parcelamento';
import { CalendarioService, type DiaCalendario } from './calendario.service';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

@Component({
  selector: 'app-calendario',
  standalone: true,
  imports: [DecimalPipe, LucideAngularModule, CardComponent, BadgeComponent, ButtonDirective],
  template: `
    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-semibold tracking-tight">Calendário</h1>
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

      <div class="grid grid-cols-7 gap-1.5 text-center text-xs font-medium text-muted-foreground">
        @for (d of diasSemana; track $index) {
          <div>{{ d }}</div>
        }
      </div>

      <div class="grid grid-cols-7 gap-1.5">
        @for (_ of espacosVazios(); track $index) {
          <div></div>
        }
        @for (dia of calendarioService.dias(); track dia.dia) {
          <button
            type="button"
            (click)="selecionado.set(dia)"
            class="flex min-h-[64px] flex-col items-start gap-1 rounded-md border p-1.5 text-left transition"
            [class]="selecionado()?.dia === dia.dia ? 'border-primary bg-primary-soft' : 'border-border hover:bg-muted'"
          >
            <span class="text-xs font-medium">{{ dia.dia }}</span>
            @if (dia.totalDespesas > 0) {
              <span class="text-[10px] tabular-nums text-critical">-{{ dia.totalDespesas | number: '1.0-0' }}</span>
            }
            @if (dia.totalReceitas > 0) {
              <span class="text-[10px] tabular-nums text-success">+{{ dia.totalReceitas | number: '1.0-0' }}</span>
            }
          </button>
        }
      </div>

      @if (selecionado(); as dia) {
        <app-card>
          <h2 class="mb-2 text-sm font-semibold">{{ dia.dia }} de {{ labelMes() }}</h2>
          <div class="flex flex-col gap-2">
            @for (l of dia.lancamentos; track l.id) {
              <div class="flex items-center justify-between text-sm">
                <span>{{ l.descricao }}</span>
                <span class="tabular-nums" [class]="l.tipo === 'receita' ? 'text-success' : 'text-critical'">
                  {{ l.tipo === 'receita' ? '+' : '-' }}{{ l.valor | number: '1.2-2' }}
                </span>
              </div>
            } @empty {
              <p class="text-sm text-muted-foreground">Nada neste dia.</p>
            }
          </div>
        </app-card>
      }
    </div>
  `,
})
export class CalendarioComponent implements OnInit {
  readonly calendarioService = inject(CalendarioService);
  readonly diasSemana = DIAS_SEMANA;
  readonly selecionado = signal<DiaCalendario | null>(null);

  readonly labelMes = computed(() => {
    const { mes, ano } = this.calendarioService.mesReferencia();
    return `${MESES[mes]} ${ano}`;
  });

  readonly espacosVazios = computed(() => {
    const { mes, ano } = this.calendarioService.mesReferencia();
    return Array.from({ length: new Date(ano, mes, 1).getDay() });
  });

  ngOnInit(): void {
    void this.calendarioService.carregar();
  }

  mesAnterior(): void {
    const { mes, ano } = this.calendarioService.mesReferencia();
    const anterior = addMonthsClamped(new Date(ano, mes, 1), -1);
    this.selecionado.set(null);
    this.calendarioService.irParaMes(anterior.getMonth(), anterior.getFullYear());
  }

  proximoMes(): void {
    const { mes, ano } = this.calendarioService.mesReferencia();
    const seguinte = addMonthsClamped(new Date(ano, mes, 1), 1);
    this.selecionado.set(null);
    this.calendarioService.irParaMes(seguinte.getMonth(), seguinte.getFullYear());
  }
}
