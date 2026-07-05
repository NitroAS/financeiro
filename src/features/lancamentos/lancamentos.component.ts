import { Component, OnInit, computed, inject, signal } from '@angular/core';
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
import { addMonthsClamped } from '../../shared/utils/parcelamento';
import { RESPONSAVEIS_PADRAO } from '../../shared/constants/seed-data';
import { ContasService } from '../contas/contas.service';
import { CategoriasService } from '../categorias/categorias.service';
import { CartoesService } from '../cartoes/cartoes.service';
import { LancamentosService, type Lancamento } from './lancamentos.service';

function paraInputDate(iso: string): string {
  return iso.slice(0, 10);
}

const lancamentoSchema = z.object({
  tipo: z.enum(['receita', 'despesa']),
  descricao: z.string().min(1, 'Informe uma descrição'),
  valor: z.number().positive('Valor deve ser maior que zero'),
  data: z.string().min(1, 'Informe a data'),
  status: z.enum(['pendente', 'pago']),
  categoriaId: z.string().optional(),
  contaId: z.string().optional(),
  cartaoId: z.string().optional(),
  responsavelId: z.string().optional(),
  observacao: z.string().optional(),
  repeticao: z.enum(['nenhuma', 'parcelado', 'recorrente']),
  quantidade: z.number().int().min(1).max(60),
});

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function parseDataLocal(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

@Component({
  selector: 'app-lancamentos',
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
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h1 class="text-xl font-semibold tracking-tight">Lançamentos</h1>
        <div class="flex flex-wrap items-center gap-1">
          <button appButton variant="ghost" size="icon" type="button" (click)="mesAnterior()" aria-label="Mês anterior">
            <lucide-angular name="chevron-left" [size]="16" />
          </button>
          <app-badge variant="primary">{{ labelMes() }}</app-badge>
          <button appButton variant="ghost" size="icon" type="button" (click)="proximoMes()" aria-label="Próximo mês">
            <lucide-angular name="chevron-right" [size]="16" />
          </button>

          <select
            appSelect
            class="ml-2 w-40"
            aria-label="Filtrar por responsável"
            [value]="lancamentosService.filtroResponsavelId()"
            (change)="filtrarPorResponsavel($event)"
          >
            <option value="">Todos os responsáveis</option>
            @for (r of responsaveis; track r.id) {
              <option [value]="r.id">{{ r.nome }}</option>
            }
          </select>

          <button appButton variant="outline" size="sm" type="button" class="ml-2" (click)="alternarLixeira()">
            <lucide-angular name="trash-2" [size]="14" />
            Lixeira
          </button>
        </div>
      </div>

      @if (mostrarLixeira()) {
        <app-card>
          <h2 class="mb-2 text-sm font-semibold">Lixeira</h2>
          <div class="flex flex-col gap-1.5">
            @for (l of lancamentosService.lixeira(); track l.id) {
              <div class="flex items-center justify-between text-sm">
                <span class="truncate text-muted-foreground line-through">{{ l.descricao }}</span>
                <div class="flex items-center gap-2">
                  <span class="tabular-nums text-muted-foreground">{{ l.valor | number: '1.2-2' }}</span>
                  <button appButton variant="ghost" size="icon" type="button" (click)="restaurar(l.id)" aria-label="Restaurar">
                    <lucide-angular name="rotate-ccw" [size]="14" />
                  </button>
                  <button appButton variant="ghost" size="icon" type="button" (click)="excluirDefinitivamente(l.id)" aria-label="Excluir definitivamente">
                    <lucide-angular name="x" [size]="14" />
                  </button>
                </div>
              </div>
            } @empty {
              <p class="text-sm text-muted-foreground">A lixeira está vazia.</p>
            }
          </div>
        </app-card>
      }

      <app-card>
        @if (editandoId(); as id) {
          <div class="mb-3 flex items-center justify-between rounded-md bg-primary-soft px-3 py-2 text-sm text-primary">
            <span class="flex items-center gap-2">
              <lucide-angular name="pencil" [size]="14" />
              Editando lançamento
            </span>
            <button appButton variant="ghost" size="sm" type="button" (click)="cancelarEdicao()">Cancelar</button>
          </div>
        }
        <form [formGroup]="form" (ngSubmit)="salvar()" class="flex flex-col gap-3">
          <div class="flex flex-wrap items-end gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted-foreground">Tipo</label>
              <select appSelect formControlName="tipo">
                <option value="despesa">Despesa</option>
                <option value="receita">Receita</option>
              </select>
            </div>

            @if (editandoId()) {
              <div class="flex flex-col gap-1">
                <label class="text-xs font-medium text-muted-foreground">Status</label>
                <select appSelect formControlName="status">
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                </select>
              </div>
            }

            <div class="flex min-w-[200px] flex-1 flex-col gap-1">
              <label class="text-xs font-medium text-muted-foreground">Descrição</label>
              <input appInput formControlName="descricao" placeholder="Ex.: Ar-condicionado" />
            </div>

            <div class="flex w-32 flex-col gap-1">
              <label class="text-xs font-medium text-muted-foreground">Valor {{ form.value.repeticao === 'parcelado' ? '(parcela)' : '' }}</label>
              <input appInput type="number" step="0.01" formControlName="valor" />
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted-foreground">Data</label>
              <input appInput type="date" formControlName="data" />
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted-foreground">Categoria</label>
              <select appSelect formControlName="categoriaId">
                <option value="">—</option>
                @for (c of categoriasFiltradas(); track c.id) {
                  <option [value]="c.id">{{ c.nome }}</option>
                }
              </select>
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted-foreground">Conta</label>
              <select appSelect formControlName="contaId">
                <option value="">—</option>
                @for (c of contasService.contas(); track c.id) {
                  <option [value]="c.id">{{ c.nome }}</option>
                }
              </select>
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted-foreground">Cartão</label>
              <select appSelect formControlName="cartaoId">
                <option value="">—</option>
                @for (c of cartoesService.cartoes(); track c.id) {
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
          </div>

          <div class="flex flex-wrap items-end gap-3">
            @if (!editandoId()) {
              <div class="flex flex-col gap-1">
                <label class="text-xs font-medium text-muted-foreground">Repetição</label>
                <select appSelect formControlName="repeticao">
                  <option value="nenhuma">Não repete</option>
                  <option value="parcelado">Parcelado</option>
                  <option value="recorrente">Recorrente (mensal)</option>
                </select>
              </div>
              @if (form.value.repeticao === 'parcelado') {
                <div class="flex w-28 flex-col gap-1">
                  <label class="text-xs font-medium text-muted-foreground">Total de parcelas</label>
                  <input appInput type="number" min="2" formControlName="quantidade" />
                </div>
              }
              @if (form.value.repeticao === 'recorrente') {
                <div class="flex w-28 flex-col gap-1">
                  <label class="text-xs font-medium text-muted-foreground">Repetir por (meses)</label>
                  <input appInput type="number" min="2" formControlName="quantidade" />
                </div>
              }
            }

            <div class="flex min-w-[200px] flex-1 flex-col gap-1">
              <label class="text-xs font-medium text-muted-foreground">Observação</label>
              <input appInput formControlName="observacao" placeholder="Opcional" />
            </div>

            <button appButton type="submit" [disabled]="form.invalid">
              <lucide-angular [name]="editandoId() ? 'check' : 'plus'" [size]="16" />
              {{ editandoId() ? 'Salvar alterações' : 'Lançar' }}
            </button>
          </div>
        </form>
      </app-card>

      <div class="flex flex-col gap-2">
        @for (l of lancamentosService.lancamentos(); track l.id) {
          <app-card class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span
                class="h-2.5 w-2.5 rounded-full"
                [class]="l.tipo === 'receita' ? 'bg-success' : 'bg-critical'"
              ></span>
              <div>
                <div class="text-sm font-medium">
                  {{ l.descricao }}
                  @if (l.parcelaTotal) {
                    <span class="ml-1 text-xs font-normal text-muted-foreground">{{ l.parcelaAtual }}/{{ l.parcelaTotal }}</span>
                  }
                  @if (l.recorrenciaId) {
                    <button
                      type="button"
                      class="ml-1 inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-normal text-muted-foreground hover:text-critical"
                      (click)="pararRecorrencia(l.recorrenciaId)"
                      title="Recorrente — clique para não repetir mais"
                    >
                      <lucide-angular name="repeat" [size]="11" />
                      recorrente
                    </button>
                  }
                </div>
                <div class="text-xs text-muted-foreground">{{ formatarData(l.data) }}</div>
              </div>
            </div>
            <div class="flex items-center gap-3">
              @if (responsavelPor(l.responsavelId); as resp) {
                <span
                  class="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
                  [style.backgroundColor]="resp.cor + '1a'"
                  [style.color]="resp.cor"
                >
                  <span class="h-1.5 w-1.5 rounded-full" [style.backgroundColor]="resp.cor"></span>
                  {{ resp.nome }}
                </span>
              }
              <app-badge [variant]="l.status === 'pago' ? 'success' : 'warning'">{{ l.status }}</app-badge>
              <span class="tabular-nums text-sm font-medium" [class]="l.tipo === 'receita' ? 'text-success' : ''">
                {{ l.tipo === 'receita' ? '+' : '-' }}{{ l.valor | number: '1.2-2' }}
              </span>
              @if (l.status !== 'pago') {
                <button appButton variant="ghost" size="icon" type="button" (click)="marcarPago(l.id)" aria-label="Marcar como pago">
                  <lucide-angular name="check" [size]="15" />
                </button>
              }
              <button
                appButton
                variant="ghost"
                size="icon"
                type="button"
                (click)="favoritar(l)"
                [attr.aria-label]="l.favorito ? 'Remover dos favoritos' : 'Favoritar'"
              >
                <lucide-angular name="star" [size]="15" [class]="l.favorito ? 'text-warning' : ''" />
              </button>
              <button appButton variant="ghost" size="icon" type="button" (click)="duplicar(l.id)" aria-label="Duplicar">
                <lucide-angular name="copy" [size]="15" />
              </button>
              <button appButton variant="ghost" size="icon" type="button" (click)="editar(l)" aria-label="Editar">
                <lucide-angular name="pencil" [size]="15" />
              </button>
              <button appButton variant="ghost" size="icon" type="button" (click)="remover(l.id)" aria-label="Remover">
                <lucide-angular name="trash-2" [size]="15" />
              </button>
            </div>
          </app-card>
        } @empty {
          <app-card class="text-sm text-muted-foreground">Nenhum lançamento neste mês.</app-card>
        }
      </div>
    </div>
  `,
})
export class LancamentosComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly lancamentosService = inject(LancamentosService);
  readonly contasService = inject(ContasService);
  readonly categoriasService = inject(CategoriasService);
  readonly cartoesService = inject(CartoesService);
  readonly responsaveis = RESPONSAVEIS_PADRAO;

  readonly categoriasFiltradas = computed(() =>
    this.categoriasService.categorias().filter((c) => c.tipo === this.form?.value.tipo),
  );

  readonly labelMes = computed(() => {
    const { mes, ano } = this.lancamentosService.mesReferencia();
    return `${MESES[mes]} ${ano}`;
  });

  readonly editandoId = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group(
    {
      tipo: ['despesa' as 'receita' | 'despesa', Validators.required],
      descricao: ['', Validators.required],
      valor: [0],
      data: [new Date().toISOString().slice(0, 10), Validators.required],
      status: ['pendente' as 'pendente' | 'pago'],
      categoriaId: [''],
      contaId: [''],
      cartaoId: [''],
      responsavelId: [''],
      observacao: [''],
      repeticao: ['nenhuma' as 'nenhuma' | 'parcelado' | 'recorrente'],
      quantidade: [2],
    },
    { validators: zodValidator(lancamentoSchema) },
  );

  ngOnInit(): void {
    void this.lancamentosService.carregar();
    void this.contasService.carregar();
    void this.categoriasService.carregar();
    void this.cartoesService.carregar();
  }

  mesAnterior(): void {
    const { mes, ano } = this.lancamentosService.mesReferencia();
    const anterior = addMonthsClamped(new Date(ano, mes, 1), -1);
    this.lancamentosService.irParaMes(anterior.getMonth(), anterior.getFullYear());
  }

  proximoMes(): void {
    const { mes, ano } = this.lancamentosService.mesReferencia();
    const seguinte = addMonthsClamped(new Date(ano, mes, 1), 1);
    this.lancamentosService.irParaMes(seguinte.getMonth(), seguinte.getFullYear());
  }

  filtrarPorResponsavel(event: Event): void {
    const responsavelId = (event.target as HTMLSelectElement).value;
    this.lancamentosService.filtrarPorResponsavel(responsavelId);
  }

  responsavelPor(id: string | null): (typeof RESPONSAVEIS_PADRAO)[number] | undefined {
    return id ? this.responsaveis.find((r) => r.id === id) : undefined;
  }

  formatarData(iso: string): string {
    return parseDataLocal(iso.slice(0, 10)).toLocaleDateString('pt-BR');
  }

  async salvar(): Promise<void> {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const editandoId = this.editandoId();

    if (editandoId) {
      await this.lancamentosService.atualizar(editandoId, {
        tipo: v.tipo,
        descricao: v.descricao,
        valor: v.valor,
        data: parseDataLocal(v.data),
        status: v.status,
        categoriaId: v.categoriaId || undefined,
        contaId: v.contaId || undefined,
        cartaoId: v.cartaoId || undefined,
        responsavelId: v.responsavelId || undefined,
        observacao: v.observacao || undefined,
      });
      this.cancelarEdicao();
      return;
    }

    if (v.repeticao === 'recorrente') {
      await this.lancamentosService.criarRecorrente({
        tipo: v.tipo,
        descricao: v.descricao,
        valor: v.valor,
        data: parseDataLocal(v.data),
        meses: v.quantidade,
        categoriaId: v.categoriaId || undefined,
        contaId: v.contaId || undefined,
        cartaoId: v.cartaoId || undefined,
        responsavelId: v.responsavelId || undefined,
        observacao: v.observacao || undefined,
      });
    } else {
      await this.lancamentosService.criar({
        tipo: v.tipo,
        descricao: v.descricao,
        valor: v.valor,
        data: parseDataLocal(v.data),
        categoriaId: v.categoriaId || undefined,
        contaId: v.contaId || undefined,
        cartaoId: v.cartaoId || undefined,
        responsavelId: v.responsavelId || undefined,
        observacao: v.observacao || undefined,
        parcelado: v.repeticao === 'parcelado',
        totalParcelas: v.quantidade,
      });
    }
    this.form.patchValue({ descricao: '', valor: 0, observacao: '', repeticao: 'nenhuma', quantidade: 2 });
  }

  editar(l: Lancamento): void {
    this.editandoId.set(l.id);
    this.form.patchValue({
      tipo: l.tipo,
      descricao: l.descricao,
      valor: l.valor,
      data: paraInputDate(l.data),
      status: l.status === 'pago' ? 'pago' : 'pendente',
      categoriaId: l.categoriaId ?? '',
      contaId: l.contaId ?? '',
      cartaoId: l.cartaoId ?? '',
      responsavelId: l.responsavelId ?? '',
      observacao: l.observacao ?? '',
      repeticao: 'nenhuma',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelarEdicao(): void {
    this.editandoId.set(null);
    this.form.reset({
      tipo: 'despesa',
      descricao: '',
      valor: 0,
      data: new Date().toISOString().slice(0, 10),
      status: 'pendente',
      categoriaId: '',
      contaId: '',
      cartaoId: '',
      responsavelId: '',
      observacao: '',
      repeticao: 'nenhuma',
      quantidade: 2,
    });
  }

  async pararRecorrencia(recorrenciaId: string | null): Promise<void> {
    if (!recorrenciaId) return;
    if (confirm('Isso remove as próximas ocorrências ainda não vencidas desta recorrência. O que já passou/foi pago continua no histórico. Continuar?')) {
      await this.lancamentosService.removerRecorrencia(recorrenciaId);
    }
  }

  async marcarPago(id: string): Promise<void> {
    await this.lancamentosService.marcarPago(id);
  }

  async remover(id: string): Promise<void> {
    await this.lancamentosService.remover(id);
  }

  async favoritar(l: Lancamento): Promise<void> {
    await this.lancamentosService.favoritar(l.id, !l.favorito);
  }

  async duplicar(id: string): Promise<void> {
    await this.lancamentosService.duplicar(id);
  }

  readonly mostrarLixeira = signal(false);

  alternarLixeira(): void {
    this.mostrarLixeira.update((v) => !v);
    if (this.mostrarLixeira()) void this.lancamentosService.carregarLixeira();
  }

  async restaurar(id: string): Promise<void> {
    await this.lancamentosService.restaurar(id);
  }

  async excluirDefinitivamente(id: string): Promise<void> {
    if (confirm('Excluir definitivamente? Essa ação não pode ser desfeita.')) {
      await this.lancamentosService.excluirDefinitivamente(id);
    }
  }
}
