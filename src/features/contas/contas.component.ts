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
import { CONTA_ICONES, CONTA_TIPOS, RESPONSAVEIS_PADRAO } from '../../shared/constants/seed-data';
import { ContasService } from './contas.service';

const contaSchema = z.object({
  nome: z.string().min(1, 'Informe um nome'),
  tipo: z.enum(CONTA_TIPOS),
  instituicao: z.string().optional(),
  saldoInicial: z.number(),
  cor: z.string().min(1),
  icone: z.string().min(1),
  responsavelId: z.string().optional(),
});

const CORES = ['#6C4CE0', '#2AA9A0', '#E0A03C', '#E05A97', '#3C9FE0', '#E05A5A'];

@Component({
  selector: 'app-contas',
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
        <h1 class="text-xl font-semibold tracking-tight">Contas</h1>
        <app-badge variant="primary">{{ contasService.contas().length }} conta(s)</app-badge>
      </div>

      <app-card>
        <form [formGroup]="form" (ngSubmit)="salvar()" class="flex flex-wrap items-end gap-3">
          <div class="flex min-w-[160px] flex-1 flex-col gap-1">
            <label class="text-xs font-medium text-muted-foreground">Nome</label>
            <input appInput formControlName="nome" placeholder="Ex.: Nubank" />
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

          <div class="flex w-32 flex-col gap-1">
            <label class="text-xs font-medium text-muted-foreground">Saldo inicial</label>
            <input appInput type="number" step="0.01" formControlName="saldoInicial" />
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-muted-foreground">Responsável</label>
            <select appSelect formControlName="responsavelId">
              <option value="">—</option>
              @for (r of responsaveis; track r.id) {
                <option [value]="r.id">{{ r.nome }}</option>
              }
            </select>
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-muted-foreground">Cor</label>
            <div class="flex h-9 items-center gap-1.5">
              @for (c of cores; track c) {
                <button
                  type="button"
                  (click)="form.patchValue({ cor: c })"
                  class="h-5 w-5 rounded-full ring-offset-2 transition"
                  [class.ring-2]="form.value.cor === c"
                  [style.background]="c"
                  [style.--tw-ring-color]="c"
                  [attr.aria-label]="'Escolher cor ' + c"
                ></button>
              }
            </div>
          </div>

          <button appButton type="submit" [disabled]="form.invalid">
            <lucide-angular name="plus" [size]="16" />
            Adicionar
          </button>
        </form>
      </app-card>

      <div class="flex flex-col gap-2">
        @for (c of contasService.contas(); track c.id) {
          <app-card class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="h-2.5 w-2.5 rounded-full" [style.background]="c.cor"></span>
              <div>
                <div class="text-sm font-medium">{{ c.nome }}</div>
                <div class="text-xs text-muted-foreground">
                  {{ c.tipo }}{{ c.instituicao ? ' · ' + c.instituicao : '' }}
                </div>
              </div>
            </div>
            <div class="flex items-center gap-4">
              @if (responsavelPor(c.responsavelId); as resp) {
                <span
                  class="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
                  [style.backgroundColor]="resp.cor + '1a'"
                  [style.color]="resp.cor"
                >
                  <span class="h-1.5 w-1.5 rounded-full" [style.backgroundColor]="resp.cor"></span>
                  {{ resp.nome }}
                </span>
              }
              <span class="tabular-nums text-sm font-medium">{{ c.saldoInicial | number: '1.2-2' }}</span>
              <button
                appButton
                variant="ghost"
                size="icon"
                type="button"
                (click)="remover(c.id)"
                aria-label="Arquivar conta"
              >
                <lucide-angular name="trash-2" [size]="16" />
              </button>
            </div>
          </app-card>
        } @empty {
          <app-card class="text-sm text-muted-foreground">Nenhuma conta cadastrada ainda.</app-card>
        }
      </div>
    </div>
  `,
})
export class ContasComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly contasService = inject(ContasService);

  readonly tipos = CONTA_TIPOS;
  readonly cores = CORES;
  readonly responsaveis = RESPONSAVEIS_PADRAO;

  readonly form = this.fb.nonNullable.group(
    {
      nome: ['', Validators.required],
      tipo: ['corrente' as (typeof CONTA_TIPOS)[number], Validators.required],
      instituicao: [''],
      saldoInicial: [0],
      cor: [CORES[0]],
      icone: [CONTA_ICONES[0] as string],
      responsavelId: [''],
    },
    { validators: zodValidator(contaSchema) },
  );

  ngOnInit(): void {
    void this.contasService.carregar();
  }

  async salvar(): Promise<void> {
    if (this.form.invalid) return;
    const valores = this.form.getRawValue();
    await this.contasService.criar({
      ...valores,
      instituicao: valores.instituicao || undefined,
      responsavelId: valores.responsavelId || undefined,
    });
    this.form.reset({
      nome: '',
      tipo: 'corrente',
      instituicao: '',
      saldoInicial: 0,
      cor: CORES[0],
      icone: CONTA_ICONES[0],
      responsavelId: '',
    });
  }

  async remover(id: string): Promise<void> {
    await this.contasService.remover(id);
  }

  responsavelPor(id: string | null): (typeof RESPONSAVEIS_PADRAO)[number] | undefined {
    return id ? this.responsaveis.find((r) => r.id === id) : undefined;
  }
}
