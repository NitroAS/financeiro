import { Component, OnInit, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { z } from 'zod';
import { CardComponent } from '../../shared/ui/card.component';
import { BadgeComponent } from '../../shared/ui/badge.component';
import { ButtonDirective } from '../../shared/ui/button.directive';
import { InputDirective } from '../../shared/ui/input.directive';
import { SelectDirective } from '../../shared/ui/select.directive';
import { zodValidator } from '../../shared/utils/zod-validator';
import { CategoriasService } from './categorias.service';

const categoriaSchema = z.object({
  nome: z.string().min(1, 'Informe um nome'),
  tipo: z.enum(['receita', 'despesa']),
  cor: z.string().min(1),
  icone: z.string().min(1),
});

const CORES = ['#6C4CE0', '#2AA9A0', '#E0A03C', '#E05A97', '#3C9FE0', '#E05A5A', '#8A8698'];

@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [ReactiveFormsModule, LucideAngularModule, CardComponent, BadgeComponent, ButtonDirective, InputDirective, SelectDirective],
  template: `
    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-semibold tracking-tight">Categorias</h1>
        <app-badge variant="primary">{{ categoriasService.categorias().length }} categoria(s)</app-badge>
      </div>

      <app-card>
        <form [formGroup]="form" (ngSubmit)="salvar()" class="flex flex-wrap items-end gap-3">
          <div class="flex min-w-[160px] flex-1 flex-col gap-1">
            <label class="text-xs font-medium text-muted-foreground">Nome</label>
            <input appInput formControlName="nome" placeholder="Ex.: Viagens" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-muted-foreground">Tipo</label>
            <select appSelect formControlName="tipo">
              <option value="despesa">despesa</option>
              <option value="receita">receita</option>
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

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div class="flex flex-col gap-2">
          <h2 class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Despesas</h2>
          @for (c of despesas(); track c.id) {
            <app-card class="flex items-center justify-between py-2.5">
              <div class="flex items-center gap-2.5">
                <span class="h-2.5 w-2.5 rounded-full" [style.background]="c.cor"></span>
                <span class="text-sm">{{ c.nome }}</span>
              </div>
              <button appButton variant="ghost" size="icon" type="button" (click)="remover(c.id)" aria-label="Remover">
                <lucide-angular name="trash-2" [size]="15" />
              </button>
            </app-card>
          }
        </div>
        <div class="flex flex-col gap-2">
          <h2 class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Receitas</h2>
          @for (c of receitas(); track c.id) {
            <app-card class="flex items-center justify-between py-2.5">
              <div class="flex items-center gap-2.5">
                <span class="h-2.5 w-2.5 rounded-full" [style.background]="c.cor"></span>
                <span class="text-sm">{{ c.nome }}</span>
              </div>
              <button appButton variant="ghost" size="icon" type="button" (click)="remover(c.id)" aria-label="Remover">
                <lucide-angular name="trash-2" [size]="15" />
              </button>
            </app-card>
          }
        </div>
      </div>
    </div>
  `,
})
export class CategoriasComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly categoriasService = inject(CategoriasService);
  readonly cores = CORES;

  readonly despesas = computed(() => this.categoriasService.categorias().filter((c) => c.tipo === 'despesa'));
  readonly receitas = computed(() => this.categoriasService.categorias().filter((c) => c.tipo === 'receita'));

  readonly form = this.fb.nonNullable.group(
    {
      nome: ['', Validators.required],
      tipo: ['despesa' as 'despesa' | 'receita', Validators.required],
      cor: [CORES[0]],
      icone: ['tag'],
    },
    { validators: zodValidator(categoriaSchema) },
  );

  ngOnInit(): void {
    void this.categoriasService.carregar();
  }

  async salvar(): Promise<void> {
    if (this.form.invalid) return;
    await this.categoriasService.criar(this.form.getRawValue());
    this.form.reset({ nome: '', tipo: 'despesa', cor: CORES[0], icone: 'tag' });
  }

  async remover(id: string): Promise<void> {
    await this.categoriasService.remover(id);
  }
}
