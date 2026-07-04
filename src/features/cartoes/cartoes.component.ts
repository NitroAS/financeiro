import { Component, OnInit, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { z } from 'zod';
import { CardComponent } from '../../shared/ui/card.component';
import { BadgeComponent } from '../../shared/ui/badge.component';
import { ButtonDirective } from '../../shared/ui/button.directive';
import { InputDirective } from '../../shared/ui/input.directive';
import { SelectDirective } from '../../shared/ui/select.directive';
import { zodValidator } from '../../shared/utils/zod-validator';
import { CARTAO_BANDEIRAS } from '../../shared/constants/seed-data';
import { ContasService } from '../contas/contas.service';
import { CartoesService } from './cartoes.service';

const cartaoSchema = z.object({
  nome: z.string().min(1, 'Informe um nome'),
  banco: z.string().min(1, 'Informe o banco'),
  bandeira: z.string().min(1),
  limite: z.number().positive('Limite deve ser maior que zero'),
  diaFechamento: z.number().int().min(1).max(31),
  diaVencimento: z.number().int().min(1).max(31),
  contaPagamentoId: z.string().optional(),
  cor: z.string().min(1),
  icone: z.string().min(1),
});

const CORES = ['#6C4CE0', '#2AA9A0', '#E0A03C', '#E05A97', '#3C9FE0'];

@Component({
  selector: 'app-cartoes',
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
        <h1 class="text-xl font-semibold tracking-tight">Cartões</h1>
        <app-badge variant="primary">{{ cartoesService.cartoes().length }} cartão(ões)</app-badge>
      </div>

      <app-card>
        <form [formGroup]="form" (ngSubmit)="salvar()" class="flex flex-wrap items-end gap-3">
          <div class="flex min-w-[140px] flex-1 flex-col gap-1">
            <label class="text-xs font-medium text-muted-foreground">Nome</label>
            <input appInput formControlName="nome" placeholder="Ex.: Nubank Roxinho" />
          </div>
          <div class="flex min-w-[120px] flex-col gap-1">
            <label class="text-xs font-medium text-muted-foreground">Banco</label>
            <input appInput formControlName="banco" placeholder="Ex.: Nubank" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-muted-foreground">Bandeira</label>
            <select appSelect formControlName="bandeira">
              @for (b of bandeiras; track b) {
                <option [value]="b">{{ b }}</option>
              }
            </select>
          </div>
          <div class="flex w-28 flex-col gap-1">
            <label class="text-xs font-medium text-muted-foreground">Limite</label>
            <input appInput type="number" step="0.01" formControlName="limite" />
          </div>
          <div class="flex w-24 flex-col gap-1">
            <label class="text-xs font-medium text-muted-foreground">Fechamento</label>
            <input appInput type="number" min="1" max="31" formControlName="diaFechamento" />
          </div>
          <div class="flex w-24 flex-col gap-1">
            <label class="text-xs font-medium text-muted-foreground">Vencimento</label>
            <input appInput type="number" min="1" max="31" formControlName="diaVencimento" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-muted-foreground">Paga com</label>
            <select appSelect formControlName="contaPagamentoId">
              <option value="">—</option>
              @for (c of contasService.contas(); track c.id) {
                <option [value]="c.id">{{ c.nome }}</option>
              }
            </select>
          </div>
          <button appButton type="submit" [disabled]="form.invalid">
            <lucide-angular name="plus" [size]="16" />
            Adicionar
          </button>
        </form>
      </app-card>

      <div class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        @for (c of cartoesService.cartoes(); track c.id) {
          <app-card class="flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="h-2.5 w-2.5 rounded-full" [style.background]="c.cor"></span>
                <span class="text-sm font-medium">{{ c.nome }}</span>
              </div>
              <button appButton variant="ghost" size="icon" type="button" (click)="remover(c.id)" aria-label="Remover">
                <lucide-angular name="trash-2" [size]="15" />
              </button>
            </div>
            <div class="text-xs text-muted-foreground">{{ c.banco }} · {{ c.bandeira }}</div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-muted-foreground">Limite</span>
              <span class="tabular-nums font-medium">{{ c.limite | number: '1.2-2' }}</span>
            </div>
            <div class="flex items-center justify-between text-xs text-muted-foreground">
              <span>Fecha dia {{ c.diaFechamento }}</span>
              <span>Vence dia {{ c.diaVencimento }}</span>
            </div>
          </app-card>
        } @empty {
          <app-card class="text-sm text-muted-foreground">Nenhum cartão cadastrado ainda.</app-card>
        }
      </div>
    </div>
  `,
})
export class CartoesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly cartoesService = inject(CartoesService);
  readonly contasService = inject(ContasService);
  readonly bandeiras = CARTAO_BANDEIRAS;

  readonly form = this.fb.nonNullable.group(
    {
      nome: ['', Validators.required],
      banco: ['', Validators.required],
      bandeira: [CARTAO_BANDEIRAS[0] as string],
      limite: [1000],
      diaFechamento: [1],
      diaVencimento: [10],
      contaPagamentoId: [''],
      cor: [CORES[0]],
      icone: ['credit-card'],
    },
    { validators: zodValidator(cartaoSchema) },
  );

  ngOnInit(): void {
    void this.cartoesService.carregar();
    void this.contasService.carregar();
  }

  async salvar(): Promise<void> {
    if (this.form.invalid) return;
    const valores = this.form.getRawValue();
    await this.cartoesService.criar({
      ...valores,
      contaPagamentoId: valores.contaPagamentoId || undefined,
    });
    this.form.reset({
      nome: '',
      banco: '',
      bandeira: CARTAO_BANDEIRAS[0],
      limite: 1000,
      diaFechamento: 1,
      diaVencimento: 10,
      contaPagamentoId: '',
      cor: CORES[0],
      icone: 'credit-card',
    });
  }

  async remover(id: string): Promise<void> {
    await this.cartoesService.remover(id);
  }
}
