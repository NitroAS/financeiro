import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { CardComponent } from '../../shared/ui/card.component';
import { BadgeComponent } from '../../shared/ui/badge.component';
import { ButtonDirective } from '../../shared/ui/button.directive';
import { InputDirective } from '../../shared/ui/input.directive';
import { ProgressComponent } from '../../shared/ui/progress.component';
import { MetasService, type MetaComPrevisao } from './metas.service';

const CORES = ['#6C4CE0', '#2AA9A0', '#E0A03C', '#E05A97', '#3C9FE0'];

@Component({
  selector: 'app-metas',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DecimalPipe,
    LucideAngularModule,
    CardComponent,
    BadgeComponent,
    ButtonDirective,
    InputDirective,
    ProgressComponent,
  ],
  template: `
    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-semibold tracking-tight">Metas</h1>
        <app-badge variant="primary">{{ metasService.metas().length }} meta(s)</app-badge>
      </div>

      <app-card>
        @if (editandoId()) {
          <div class="mb-3 flex items-center justify-between rounded-md bg-primary-soft px-3 py-2 text-sm text-primary">
            <span class="flex items-center gap-2">
              <lucide-angular name="pencil" [size]="14" />
              Editando meta
            </span>
            <button appButton variant="ghost" size="sm" type="button" (click)="cancelarEdicao()">Cancelar</button>
          </div>
        }
        <form [formGroup]="form" (ngSubmit)="salvar()" class="flex flex-wrap items-end gap-3">
          <div class="flex min-w-[160px] flex-1 flex-col gap-1">
            <label class="text-xs font-medium text-muted-foreground">Nome</label>
            <input appInput formControlName="nome" placeholder="Ex.: Reserva de emergência" />
          </div>
          <div class="flex w-32 flex-col gap-1">
            <label class="text-xs font-medium text-muted-foreground">Valor alvo</label>
            <input appInput type="number" step="0.01" formControlName="valorAlvo" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-muted-foreground">Data alvo</label>
            <input appInput type="date" formControlName="dataAlvo" />
          </div>
          <button appButton type="submit" [disabled]="form.invalid || salvando()">
            <lucide-angular [name]="editandoId() ? 'check' : 'plus'" [size]="16" />
            {{ salvando() ? 'Salvando...' : editandoId() ? 'Salvar alterações' : 'Criar meta' }}
          </button>
        </form>
      </app-card>

      <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
        @for (m of metasService.metas(); track m.id) {
          <app-card class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="h-2.5 w-2.5 rounded-full" [style.background]="m.cor"></span>
                <span class="text-sm font-medium">{{ m.nome }}</span>
              </div>
              <button appButton variant="ghost" size="icon" type="button" (click)="editar(m)" aria-label="Editar">
                <lucide-angular name="pencil" [size]="15" />
              </button>
              <button appButton variant="ghost" size="icon" type="button" (click)="remover(m.id)" aria-label="Remover">
                <lucide-angular name="trash-2" [size]="15" />
              </button>
            </div>

            <app-progress [value]="m.valorAtual" [max]="m.valorAlvo" />

            <div class="flex items-center justify-between text-xs text-muted-foreground">
              <span>{{ m.valorAtual | number: '1.2-2' }} / {{ m.valorAlvo | number: '1.2-2' }}</span>
              <span>{{ m.percentual | number: '1.0-0' }}%</span>
            </div>

            <div class="flex items-center justify-between text-xs text-muted-foreground">
              <span>Falta {{ m.falta | number: '1.2-2' }}</span>
              @if (m.previsaoMeses) {
                <span>Previsão: {{ m.previsaoMeses }} {{ m.previsaoMeses === 1 ? 'mês' : 'meses' }}</span>
              }
            </div>

            <div class="flex items-center gap-2 border-t border-border pt-2">
              <input appInput type="number" step="0.01" [id]="'valor-' + m.id" placeholder="Valor" class="h-8 flex-1 text-xs" />
              <button appButton size="sm" type="button" (click)="movimento(m.id, 'aporte')">Aportar</button>
              <button appButton size="sm" variant="outline" type="button" (click)="movimento(m.id, 'resgate')">Resgatar</button>
            </div>
          </app-card>
        } @empty {
          <app-card class="text-sm text-muted-foreground">Nenhuma meta cadastrada ainda.</app-card>
        }
      </div>
    </div>
  `,
})
export class MetasComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly metasService = inject(MetasService);
  readonly editandoId = signal<string | null>(null);
  readonly salvando = signal(false);

  readonly form = this.fb.nonNullable.group({
    nome: ['', Validators.required],
    valorAlvo: [1000, Validators.min(1)],
    dataAlvo: [''],
  });

  ngOnInit(): void {
    void this.metasService.carregar();
  }

  async salvar(): Promise<void> {
    if (this.form.invalid || this.salvando()) return;
    this.salvando.set(true);
    try {
      const v = this.form.getRawValue();
      const editandoId = this.editandoId();

      if (editandoId) {
        await this.metasService.atualizar(editandoId, {
          nome: v.nome,
          valorAlvo: v.valorAlvo,
          dataAlvo: v.dataAlvo || undefined,
        });
        this.cancelarEdicao();
        return;
      }

      const cor = CORES[this.metasService.metas().length % CORES.length];
      await this.metasService.criar({
        nome: v.nome,
        valorAlvo: v.valorAlvo,
        dataAlvo: v.dataAlvo || undefined,
        cor,
        icone: 'target',
      });
      this.form.reset({ nome: '', valorAlvo: 1000, dataAlvo: '' });
    } finally {
      this.salvando.set(false);
    }
  }

  editar(m: MetaComPrevisao): void {
    this.editandoId.set(m.id);
    this.form.patchValue({ nome: m.nome, valorAlvo: m.valorAlvo, dataAlvo: m.dataAlvo ?? '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelarEdicao(): void {
    this.editandoId.set(null);
    this.form.reset({ nome: '', valorAlvo: 1000, dataAlvo: '' });
  }

  async movimento(metaId: string, tipo: 'aporte' | 'resgate'): Promise<void> {
    const input = document.getElementById(`valor-${metaId}`) as HTMLInputElement | null;
    const valor = Number(input?.value) || 0;
    if (valor <= 0) return;
    await this.metasService.registrarMovimento(metaId, tipo, valor);
    if (input) input.value = '';
  }

  async remover(id: string): Promise<void> {
    await this.metasService.remover(id);
  }
}
