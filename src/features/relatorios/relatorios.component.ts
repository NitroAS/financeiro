import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { NgApexchartsModule, type ApexOptions } from 'ng-apexcharts';
import { CardComponent } from '../../shared/ui/card.component';
import { BadgeComponent } from '../../shared/ui/badge.component';
import { ButtonDirective } from '../../shared/ui/button.directive';
import { SelectDirective } from '../../shared/ui/select.directive';
import { ContasService } from '../contas/contas.service';
import { CategoriasService } from '../categorias/categorias.service';
import { CartoesService } from '../cartoes/cartoes.service';
import { RelatoriosService } from './relatorios.service';
import { exportarCsv, exportarExcel, type LinhaExportavel } from '../../shared/utils/exportar';

@Component({
  selector: 'app-relatorios',
  standalone: true,
  imports: [
    FormsModule,
    DecimalPipe,
    LucideAngularModule,
    NgApexchartsModule,
    CardComponent,
    BadgeComponent,
    ButtonDirective,
    SelectDirective,
  ],
  template: `
    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-semibold tracking-tight">Relatórios</h1>
        <div class="no-print flex items-center gap-2">
          <button appButton variant="outline" size="sm" type="button" (click)="exportarCsvClick()">
            <lucide-angular name="file-bar-chart-2" [size]="14" /> CSV
          </button>
          <button appButton variant="outline" size="sm" type="button" (click)="exportarExcelClick()">
            <lucide-angular name="file-bar-chart-2" [size]="14" /> Excel
          </button>
          <button appButton variant="outline" size="sm" type="button" (click)="imprimir()">
            <lucide-angular name="file-bar-chart-2" [size]="14" /> PDF
          </button>
        </div>
      </div>

      <app-card class="no-print">
        <div class="flex flex-wrap items-end gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-muted-foreground">Período</label>
            <select appSelect [(ngModel)]="meses" (ngModelChange)="recarregar()">
              <option [ngValue]="3">Últimos 3 meses</option>
              <option [ngValue]="6">Últimos 6 meses</option>
              <option [ngValue]="12">Últimos 12 meses</option>
            </select>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-muted-foreground">Categoria</label>
            <select appSelect [(ngModel)]="categoriaId" (ngModelChange)="recarregar()">
              <option [ngValue]="undefined">Todas</option>
              @for (c of categoriasService.categorias(); track c.id) {
                <option [ngValue]="c.id">{{ c.nome }}</option>
              }
            </select>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-muted-foreground">Conta</label>
            <select appSelect [(ngModel)]="contaId" (ngModelChange)="recarregar()">
              <option [ngValue]="undefined">Todas</option>
              @for (c of contasService.contas(); track c.id) {
                <option [ngValue]="c.id">{{ c.nome }}</option>
              }
            </select>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-muted-foreground">Cartão</label>
            <select appSelect [(ngModel)]="cartaoId" (ngModelChange)="recarregar()">
              <option [ngValue]="undefined">Todos</option>
              @for (c of cartoesService.cartoes(); track c.id) {
                <option [ngValue]="c.id">{{ c.nome }}</option>
              }
            </select>
          </div>
        </div>
      </app-card>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <app-card>
          <h2 class="mb-2 text-sm font-semibold">Gastos por categoria</h2>
          @if (donutOptions(); as opts) {
            <apx-chart
              [series]="opts.series!"
              [chart]="opts.chart!"
              [labels]="opts.labels!"
              [colors]="opts.colors ?? []"
              [legend]="opts.legend!"
              [dataLabels]="opts.dataLabels!"
            />
          } @else {
            <p class="text-sm text-muted-foreground">Sem despesas no período.</p>
          }
        </app-card>

        <app-card>
          <h2 class="mb-2 text-sm font-semibold">Fluxo de caixa</h2>
          @if (carregado()) {
            <apx-chart
              [series]="fluxoOptions().series!"
              [chart]="fluxoOptions().chart!"
              [xaxis]="fluxoOptions().xaxis!"
              [yaxis]="fluxoOptions().yaxis!"
              [colors]="fluxoOptions().colors ?? []"
              [dataLabels]="fluxoOptions().dataLabels!"
              [legend]="fluxoOptions().legend!"
            />
          }
        </app-card>
      </div>

      <app-card>
        <h2 class="mb-2 text-sm font-semibold">Lançamentos no período ({{ relatoriosService.lancamentos().length }})</h2>
        <div class="flex flex-col gap-1.5">
          @for (l of relatoriosService.lancamentos(); track l.id) {
            <div class="flex items-center justify-between border-b border-border py-1.5 text-sm last:border-0">
              <span class="text-xs text-muted-foreground">{{ formatarData(l.data) }}</span>
              <span class="flex-1 truncate px-3">{{ l.descricao }}</span>
              <span class="tabular-nums" [class]="l.tipo === 'receita' ? 'text-success' : 'text-critical'">
                {{ l.tipo === 'receita' ? '+' : '-' }}{{ l.valor | number: '1.2-2' }}
              </span>
            </div>
          } @empty {
            <p class="text-sm text-muted-foreground">Nenhum lançamento no período/filtro selecionado.</p>
          }
        </div>
      </app-card>
    </div>
  `,
})
export class RelatoriosComponent implements OnInit {
  readonly relatoriosService = inject(RelatoriosService);
  readonly categoriasService = inject(CategoriasService);
  readonly contasService = inject(ContasService);
  readonly cartoesService = inject(CartoesService);

  meses = 6;
  categoriaId?: string;
  contaId?: string;
  cartaoId?: string;

  readonly donutOptions = computed((): Partial<ApexOptions> | null => {
    const fatias = this.relatoriosService.gastosPorCategoria();
    if (!fatias.length) return null;
    return {
      series: fatias.map((f) => f.valor),
      labels: fatias.map((f) => f.nome),
      colors: fatias.map((f) => f.cor),
      chart: { type: 'donut', height: 260 },
      legend: { position: 'bottom' },
      dataLabels: { enabled: false },
    };
  });

  readonly carregado = signal(false);

  readonly fluxoOptions = computed((): Partial<ApexOptions> => {
    const pontos = this.relatoriosService.fluxoCaixa();
    return {
      series: [
        { name: 'Receitas', data: pontos.map((p) => p.receitas) },
        { name: 'Despesas', data: pontos.map((p) => p.despesas) },
      ],
      chart: { type: 'bar', height: 260, stacked: false },
      xaxis: { categories: pontos.map((p) => p.label) },
      yaxis: { labels: { formatter: (v: number) => v.toFixed(0) } },
      colors: ['#2AA96B', '#C6423F'],
      dataLabels: { enabled: false },
      legend: { position: 'bottom' },
    };
  });

  ngOnInit(): void {
    void this.categoriasService.carregar();
    void this.contasService.carregar();
    void this.cartoesService.carregar();
    void this.recarregar();
  }

  async recarregar(): Promise<void> {
    this.carregado.set(false);
    await this.relatoriosService.carregar({
      meses: this.meses,
      categoriaId: this.categoriaId,
      contaId: this.contaId,
      cartaoId: this.cartaoId,
    });
    this.carregado.set(true);
  }

  formatarData(iso: string): string {
    return new Date(iso).toLocaleDateString('pt-BR');
  }

  private linhasExportaveis(): LinhaExportavel[] {
    return this.relatoriosService.lancamentos().map((l) => ({
      Data: this.formatarData(l.data),
      Descrição: l.descricao,
      Tipo: l.tipo,
      Categoria: this.categoriasService.categorias().find((c) => c.id === l.categoriaId)?.nome ?? '',
      Valor: l.valor,
      Status: l.status,
    }));
  }

  exportarCsvClick(): void {
    exportarCsv(this.linhasExportaveis(), 'relatorio-financeiro');
  }

  exportarExcelClick(): void {
    exportarExcel(this.linhasExportaveis(), 'relatorio-financeiro');
  }

  imprimir(): void {
    window.print();
  }
}
