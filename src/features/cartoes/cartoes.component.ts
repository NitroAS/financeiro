import { Component, OnInit, inject, signal } from '@angular/core';
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
import { CARTAO_BANDEIRAS, RESPONSAVEIS_PADRAO } from '../../shared/constants/seed-data';
import { ContasService } from '../contas/contas.service';
import { CartoesService, type Cartao } from './cartoes.service';
import { LancamentosService } from '../lancamentos/lancamentos.service';
import { ProgressComponent } from '../../shared/ui/progress.component';

const cartaoSchema = z.object({
  nome: z.string().min(1, 'Informe um nome'),
  banco: z.string().min(1, 'Informe o banco'),
  bandeira: z.string().min(1),
  limite: z.number().positive('Limite deve ser maior que zero'),
  diaFechamento: z.number().int().min(1).max(31),
  diaVencimento: z.number().int().min(1).max(31),
  contaPagamentoId: z.string().optional(),
  responsavelId: z.string().optional(),
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
    ProgressComponent,
  ],
  template: `
    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-semibold tracking-tight">Cartões</h1>
        <app-badge variant="primary">{{ cartoesService.cartoes().length }} cartão(ões)</app-badge>
      </div>

      <app-card>
        @if (editandoId()) {
          <div class="mb-3 flex items-center justify-between rounded-md bg-primary-soft px-3 py-2 text-sm text-primary">
            <span class="flex items-center gap-2">
              <lucide-angular name="pencil" [size]="14" />
              Editando cartão
            </span>
            <button appButton variant="ghost" size="sm" type="button" (click)="cancelarEdicao()">Cancelar</button>
          </div>
        }
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
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-muted-foreground">Responsável</label>
            <select appSelect formControlName="responsavelId">
              <option value="">—</option>
              @for (r of responsaveis; track r.id) {
                <option [value]="r.id">{{ r.nome }}</option>
              }
            </select>
          </div>
          <button appButton type="submit" [disabled]="form.invalid">
            <lucide-angular [name]="editandoId() ? 'check' : 'plus'" [size]="16" />
            {{ editandoId() ? 'Salvar alterações' : 'Adicionar' }}
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
              <button appButton variant="ghost" size="icon" type="button" (click)="editar(c)" aria-label="Editar cartão">
                <lucide-angular name="pencil" [size]="15" />
              </button>
              <button appButton variant="ghost" size="icon" type="button" (click)="remover(c.id)" [disabled]="removendoIds().has(c.id)" aria-label="Remover">
                <lucide-angular name="trash-2" [size]="15" />
              </button>
            </div>
            <div class="flex items-center justify-between text-xs text-muted-foreground">
              <span>{{ c.banco }} · {{ c.bandeira }}</span>
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
            </div>

            @if (cartoesService.resumos()[c.id]; as resumo) {
              <div class="flex flex-col gap-1">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-muted-foreground">Usado {{ resumo.usado | number: '1.2-2' }}</span>
                  <span class="text-muted-foreground">Disponível {{ resumo.disponivel | number: '1.2-2' }}</span>
                </div>
                <app-progress [value]="resumo.usado" [max]="c.limite" />
              </div>

              <div class="flex items-center justify-between text-xs text-muted-foreground">
                <span>Fecha dia {{ c.diaFechamento }}</span>
                <span>Vence dia {{ c.diaVencimento }}</span>
              </div>

              <div class="flex items-center justify-between rounded-md bg-muted px-2.5 py-1.5 text-xs">
                <span>Próxima fatura ({{ resumo.vencimento.toLocaleDateString('pt-BR') }})</span>
                <span class="tabular-nums font-semibold">{{ resumo.valorFaturaAberta | number: '1.2-2' }}</span>
              </div>

              @if (resumo.lancamentosFaturaAberta.length) {
                <div class="flex flex-col gap-1.5 border-t border-border pt-2">
                  @for (l of resumo.lancamentosFaturaAberta; track l.id) {
                    <div class="flex items-center justify-between text-xs">
                      <span class="truncate">
                        {{ l.descricao }}
                        @if (l.parcelaTotal) {
                          <span class="text-muted-foreground">{{ l.parcelaAtual }}/{{ l.parcelaTotal }}</span>
                        }
                      </span>
                      <div class="flex items-center gap-2">
                        <span class="tabular-nums">{{ l.valor | number: '1.2-2' }}</span>
                        <button appButton variant="ghost" size="icon" type="button" (click)="quitar(l.id)" aria-label="Quitar parcela">
                          <lucide-angular name="check" [size]="13" />
                        </button>
                      </div>
                    </div>
                  }
                </div>
              }
            }
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
  private readonly lancamentosService = inject(LancamentosService);
  readonly bandeiras = CARTAO_BANDEIRAS;
  readonly responsaveis = RESPONSAVEIS_PADRAO;
  readonly editandoId = signal<string | null>(null);
  readonly salvando = signal(false);

  readonly form = this.fb.nonNullable.group(
    {
      nome: ['', Validators.required],
      banco: ['', Validators.required],
      bandeira: [CARTAO_BANDEIRAS[0] as string],
      limite: [1000],
      diaFechamento: [1],
      diaVencimento: [10],
      contaPagamentoId: [''],
      responsavelId: [''],
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
    if (this.form.invalid || this.salvando()) return;
    this.salvando.set(true);
    try {
      const valores = this.form.getRawValue();
      const editandoId = this.editandoId();

      if (editandoId) {
        await this.cartoesService.atualizar(editandoId, {
          ...valores,
          contaPagamentoId: valores.contaPagamentoId || undefined,
          responsavelId: valores.responsavelId || undefined,
        });
        this.cancelarEdicao();
        return;
      }

      await this.cartoesService.criar({
        ...valores,
        contaPagamentoId: valores.contaPagamentoId || undefined,
        responsavelId: valores.responsavelId || undefined,
      });
      this.form.reset({
        nome: '',
        banco: '',
        bandeira: CARTAO_BANDEIRAS[0],
        limite: 1000,
        diaFechamento: 1,
        diaVencimento: 10,
        contaPagamentoId: '',
        responsavelId: '',
        cor: CORES[0],
        icone: 'credit-card',
      });
    } finally {
      this.salvando.set(false);
    }
  }

  editar(c: Cartao): void {
    this.editandoId.set(c.id);
    this.form.patchValue({
      nome: c.nome,
      banco: c.banco,
      bandeira: c.bandeira,
      limite: c.limite,
      diaFechamento: c.diaFechamento,
      diaVencimento: c.diaVencimento,
      contaPagamentoId: c.contaPagamentoId ?? '',
      responsavelId: c.responsavelId ?? '',
      cor: c.cor,
      icone: c.icone,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelarEdicao(): void {
    this.editandoId.set(null);
    this.form.reset({
      nome: '',
      banco: '',
      bandeira: CARTAO_BANDEIRAS[0],
      limite: 1000,
      diaFechamento: 1,
      diaVencimento: 10,
      contaPagamentoId: '',
      responsavelId: '',
      cor: CORES[0],
      icone: 'credit-card',
    });
  }

  readonly removendoIds = signal<ReadonlySet<string>>(new Set());

  async remover(id: string): Promise<void> {
    if (this.removendoIds().has(id)) return;
    this.removendoIds.set(new Set([...this.removendoIds(), id]));
    try {
      await this.cartoesService.remover(id);
    } finally {
      const restante = new Set(this.removendoIds());
      restante.delete(id);
      this.removendoIds.set(restante);
    }
  }

  responsavelPor(id: string | null): (typeof RESPONSAVEIS_PADRAO)[number] | undefined {
    return id ? this.responsaveis.find((r) => r.id === id) : undefined;
  }

  async quitar(lancamentoId: string): Promise<void> {
    await this.lancamentosService.marcarPago(lancamentoId);
    await this.cartoesService.carregar();
  }
}
