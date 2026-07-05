import { Component, OnInit, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { CardComponent } from '../../shared/ui/card.component';
import { BadgeComponent } from '../../shared/ui/badge.component';
import { ButtonDirective } from '../../shared/ui/button.directive';
import { InputDirective } from '../../shared/ui/input.directive';
import { SelectDirective } from '../../shared/ui/select.directive';
import { InvestimentosService } from './investimentos.service';

const TIPOS = ['CDB', 'Tesouro', 'ETF', 'Acao', 'Fundo', 'Cripto'] as const;

@Component({
  selector: 'app-investimentos',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DecimalPipe,
    LucideAngularModule,
    CardComponent,
    BadgeComponent,
    ButtonDirective,
    InputDirective,
    SelectDirective,
  ],
  template: `
    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-semibold tracking-tight">Investimentos</h1>
        <app-badge variant="primary">{{ investimentosService.investimentos().length }} ativo(s)</app-badge>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <app-card>
          <div class="text-xs text-muted-foreground">Patrimônio investido</div>
          <div class="mt-1 tabular-nums text-lg font-semibold">
            {{ investimentosService.patrimonioTotal | number: '1.2-2' }}
          </div>
        </app-card>
        <app-card>
          <div class="text-xs text-muted-foreground">Lucro (rendimentos)</div>
          <div class="mt-1 tabular-nums text-lg font-semibold text-success">
            {{ investimentosService.lucroTotal | number: '1.2-2' }}
          </div>
        </app-card>
      </div>

      <app-card>
        <form [formGroup]="form" (ngSubmit)="salvar()" class="flex flex-wrap items-end gap-3">
          <div class="flex min-w-[160px] flex-1 flex-col gap-1">
            <label class="text-xs font-medium text-muted-foreground">Nome</label>
            <input appInput formControlName="nome" placeholder="Ex.: Tesouro Selic 2029" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-muted-foreground">Tipo</label>
            <select appSelect formControlName="tipo">
              @for (t of tipos; track t) {
                <option [value]="t">{{ t }}</option>
              }
            </select>
          </div>
          <div class="flex min-w-[140px] flex-col gap-1">
            <label class="text-xs font-medium text-muted-foreground">Instituição</label>
            <input appInput formControlName="instituicao" placeholder="Opcional" />
          </div>
          <button appButton type="submit" [disabled]="form.invalid">
            <lucide-angular name="plus" [size]="16" />
            Adicionar
          </button>
        </form>
      </app-card>

      <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
        @for (i of investimentosService.investimentos(); track i.id) {
          <app-card class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-sm font-medium">{{ i.nome }}</div>
                <div class="text-xs text-muted-foreground">{{ i.tipo }}{{ i.instituicao ? ' · ' + i.instituicao : '' }}</div>
              </div>
              <button appButton variant="ghost" size="icon" type="button" (click)="remover(i.id)" aria-label="Remover">
                <lucide-angular name="trash-2" [size]="15" />
              </button>
            </div>

            <div class="flex items-center justify-between text-sm">
              <span class="text-muted-foreground">Saldo</span>
              <span class="tabular-nums font-semibold">{{ i.saldo | number: '1.2-2' }}</span>
            </div>
            <div class="flex items-center justify-between text-xs text-muted-foreground">
              <span>Aportado {{ i.aportado | number: '1.2-2' }}</span>
              <span>Rendimento {{ i.rendimento | number: '1.2-2' }}</span>
            </div>

            <div class="flex items-center gap-2 border-t border-border pt-2">
              <input appInput type="number" step="0.01" [id]="'valor-inv-' + i.id" placeholder="Valor" class="h-8 flex-1 text-xs" />
              <button appButton size="sm" type="button" (click)="movimento(i.id, 'aporte')">Aportar</button>
              <button appButton size="sm" variant="outline" type="button" (click)="movimento(i.id, 'rendimento')">Rendeu</button>
              <button appButton size="sm" variant="outline" type="button" (click)="movimento(i.id, 'resgate')">Resgatar</button>
            </div>
          </app-card>
        } @empty {
          <app-card class="text-sm text-muted-foreground">Nenhum investimento cadastrado ainda.</app-card>
        }
      </div>
    </div>
  `,
})
export class InvestimentosComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly investimentosService = inject(InvestimentosService);
  readonly tipos = TIPOS;

  readonly form = this.fb.nonNullable.group({
    nome: ['', Validators.required],
    tipo: ['CDB' as (typeof TIPOS)[number], Validators.required],
    instituicao: [''],
  });

  ngOnInit(): void {
    void this.investimentosService.carregar();
  }

  async salvar(): Promise<void> {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    await this.investimentosService.criar({ ...v, instituicao: v.instituicao || undefined });
    this.form.reset({ nome: '', tipo: 'CDB', instituicao: '' });
  }

  async movimento(investimentoId: string, tipo: 'aporte' | 'resgate' | 'rendimento'): Promise<void> {
    const input = document.getElementById(`valor-inv-${investimentoId}`) as HTMLInputElement | null;
    const valor = Number(input?.value) || 0;
    if (valor <= 0) return;
    await this.investimentosService.registrarMovimento(investimentoId, tipo, valor);
    if (input) input.value = '';
  }

  async remover(id: string): Promise<void> {
    await this.investimentosService.remover(id);
  }
}
