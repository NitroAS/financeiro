import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
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
  parcelaInicial: z.number().int().min(1).max(60),
}).refine((v) => v.repeticao !== 'parcelado' || v.parcelaInicial <= v.quantidade, {
  message: 'A parcela inicial não pode ser maior que o total de parcelas',
  path: ['parcelaInicial'],
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
    NgTemplateOutlet,
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

          <select
            appSelect
            class="ml-2 w-44"
            aria-label="Organizar por"
            [value]="modoAgrupamento()"
            (change)="modoAgrupamento.set($any($event.target).value)"
          >
            <option value="nenhuma">Lista simples</option>
            <option value="pessoa">Ver por pessoa</option>
            <option value="cartao">Ver por cartão</option>
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

      <ng-template #formularioLancamento>
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
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted-foreground">Repetição</label>
              <select appSelect formControlName="repeticao">
                <option value="nenhuma">Compra única</option>
                <option value="parcelado">Parcelado</option>
                <option value="recorrente">Recorrente (mensal)</option>
              </select>
            </div>
            @if (editandoId() && form.value.repeticao !== repeticaoOriginalEdicao()) {
              <p class="w-full text-xs text-warning">
                @if (form.value.repeticao === 'nenhuma') {
                  Isso desvincula só este lançamento do grupo — o restante das parcelas/ocorrências continua como está.
                } @else {
                  Isso transforma este lançamento no início de um novo {{ form.value.repeticao === 'parcelado' ? 'parcelamento' : 'plano recorrente' }}, gerando as próximas ocorrências a partir da data acima.
                }
              </p>
            }
            @if (form.value.repeticao === 'parcelado' && mostrarQuantidade()) {
              <div class="flex flex-col gap-1">
                <label class="text-xs font-medium text-muted-foreground">Total de parcelas</label>
                <div class="flex flex-wrap items-center gap-1">
                  <input appInput type="number" min="2" class="w-20" formControlName="quantidade" />
                  @for (n of opcoesParcelas; track n) {
                    <button
                      type="button"
                      class="rounded-md border border-border px-2 py-1 text-xs"
                      [class]="form.value.quantidade === n ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted'"
                      (click)="form.patchValue({ quantidade: n })"
                    >
                      {{ n }}x
                    </button>
                  }
                </div>
              </div>
              <div class="flex w-40 flex-col gap-1">
                <label class="text-xs font-medium text-muted-foreground" title="Se a compra já está em andamento (ex.: 3/12), coloque aqui a parcela atual em vez de começar do 1">
                  Começar a partir da parcela
                </label>
                <input appInput type="number" min="1" [attr.max]="form.value.quantidade" formControlName="parcelaInicial" />
              </div>
            }
            @if (form.value.repeticao === 'recorrente' && mostrarQuantidade()) {
              <div class="flex flex-col gap-1">
                <label class="text-xs font-medium text-muted-foreground">Repetir por (meses)</label>
                <div class="flex flex-wrap items-center gap-1">
                  <input appInput type="number" min="2" class="w-20" formControlName="quantidade" />
                  @for (n of opcoesRecorrencia; track n) {
                    <button
                      type="button"
                      class="rounded-md border border-border px-2 py-1 text-xs"
                      [class]="form.value.quantidade === n ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted'"
                      (click)="form.patchValue({ quantidade: n })"
                    >
                      {{ n }}
                    </button>
                  }
                </div>
              </div>
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
      </ng-template>

      @if (!editandoId()) {
        <app-card>
          <ng-container *ngTemplateOutlet="formularioLancamento" />
        </app-card>
      }

      <ng-template #linhaLancamento let-l>
        @if (editandoId() === l.id) {
          <app-card [id]="'lancamento-' + l.id">
            <div class="mb-3 flex items-center justify-between rounded-md bg-primary-soft px-3 py-2 text-sm text-primary">
              <span class="flex items-center gap-2">
                <lucide-angular name="pencil" [size]="14" />
                Editando lançamento
              </span>
              <button appButton variant="ghost" size="sm" type="button" (click)="cancelarEdicao()">Cancelar</button>
            </div>
            <ng-container *ngTemplateOutlet="formularioLancamento" />
          </app-card>
        } @else {
          <app-card
            [id]="'lancamento-' + l.id"
            class="flex items-center justify-between transition-shadow duration-500"
            [class.ring-2]="lancamentosService.destacarId() === l.id"
            [class.ring-primary]="lancamentosService.destacarId() === l.id"
          >
            <div class="flex items-center gap-3">
              <span
                class="h-2.5 w-2.5 rounded-full"
                [class]="l.tipo === 'receita' ? 'bg-success' : 'bg-critical'"
              ></span>
              <div>
                <div class="text-sm font-medium">
                  @if (l.grupoParcelamentoId || l.recorrenciaId) {
                    <button type="button" class="text-left hover:underline" (click)="verDetalhe(l)">{{ l.descricao }}</button>
                  } @else {
                    {{ l.descricao }}
                  }
                  @if (l.parcelaTotal) {
                    <button
                      type="button"
                      class="ml-1 text-xs font-normal text-muted-foreground hover:text-primary hover:underline"
                      (click)="verDetalhe(l)"
                    >
                      {{ l.parcelaAtual }}/{{ l.parcelaTotal }}
                    </button>
                  }
                  @if (l.recorrenciaId) {
                    <button
                      type="button"
                      class="ml-1 inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-normal text-muted-foreground hover:text-primary"
                      (click)="verDetalhe(l)"
                      title="Recorrente — clique para ver as ocorrências"
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
              @if (modoAgrupamento() !== 'cartao' && cartaoPor(l.cartaoId); as cart) {
                <span
                  class="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
                  [style.backgroundColor]="cart.cor + '1a'"
                  [style.color]="cart.cor"
                  [title]="cart.banco + ' • ' + cart.bandeira"
                >
                  <lucide-angular name="credit-card" [size]="11" />
                  {{ cart.nome }}
                </span>
              }
              @if (modoAgrupamento() !== 'pessoa' && responsavelPor(l.responsavelId); as resp) {
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
        }
      </ng-template>

      <ng-template #subgrupoNatureza let-sub>
        @let temMaisDeUmaNatureza = (sub.parcelados.length > 0 ? 1 : 0) + (sub.recorrentes.length > 0 ? 1 : 0) + (sub.avulsos.length > 0 ? 1 : 0) > 1;

        @if (sub.avulsos.length > 0) {
          @if (temMaisDeUmaNatureza) {
            <h4 class="px-1 text-[11px] font-medium text-muted-foreground">Avulsas</h4>
          }
          @for (l of sub.avulsos; track l.id) {
            <ng-container *ngTemplateOutlet="linhaLancamento; context: { $implicit: l }" />
          }
        }

        @if (sub.parcelados.length > 0) {
          <h4 class="flex items-center gap-1 px-1 text-[11px] font-medium text-muted-foreground">
            <lucide-angular name="layers" [size]="11" />
            Parceladas
          </h4>
          @for (l of sub.parcelados; track l.id) {
            <ng-container *ngTemplateOutlet="linhaLancamento; context: { $implicit: l }" />
          }
        }

        @if (sub.recorrentes.length > 0) {
          <h4 class="flex items-center gap-1 px-1 text-[11px] font-medium text-muted-foreground">
            <lucide-angular name="repeat" [size]="11" />
            Recorrentes
          </h4>
          @for (l of sub.recorrentes; track l.id) {
            <ng-container *ngTemplateOutlet="linhaLancamento; context: { $implicit: l }" />
          }
        }
      </ng-template>

      @if (modoAgrupamento() !== 'nenhuma') {
        <div class="flex flex-col gap-4">
          @for (grupo of gruposParaExibir(); track grupo.chave) {
            <div class="flex flex-col gap-2">
              <button
                type="button"
                class="flex flex-wrap items-center justify-between gap-2 rounded-md px-1 text-left hover:bg-muted"
                (click)="alternarColapso(grupo.chave)"
                [attr.aria-expanded]="!estaColapsado(grupo.chave)"
                [attr.aria-label]="(estaColapsado(grupo.chave) ? 'Expandir' : 'Recolher') + ' ' + grupo.titulo"
              >
                <span class="flex items-center gap-2 text-sm font-semibold">
                  <lucide-angular [name]="estaColapsado(grupo.chave) ? 'chevron-right' : 'chevron-down'" [size]="14" class="text-muted-foreground" />
                  <span class="h-2.5 w-2.5 rounded-full" [style.backgroundColor]="grupo.cor"></span>
                  {{ grupo.titulo }}
                  @if (grupo.subtitulo) {
                    <span class="text-xs font-normal text-muted-foreground">{{ grupo.subtitulo }}</span>
                  }
                  <span class="font-normal text-muted-foreground">({{ totalSubgrupo(grupo.receitas) + totalSubgrupo(grupo.despesas) }})</span>
                </span>
                <span class="flex items-center gap-3 text-xs">
                  <span class="text-success">+{{ grupo.totalReceitas | number: '1.2-2' }}</span>
                  <span class="text-critical">-{{ grupo.totalDespesas | number: '1.2-2' }}</span>
                  <span class="font-semibold" [class]="grupo.saldo >= 0 ? 'text-success' : 'text-critical'">
                    = {{ grupo.saldo | number: '1.2-2' }}
                  </span>
                </span>
              </button>

              @if (!estaColapsado(grupo.chave)) {
                @if (totalSubgrupo(grupo.receitas) > 0) {
                  <div class="flex flex-col gap-2.5">
                    <h3 class="px-1 text-xs font-semibold uppercase tracking-wide text-success">Receitas</h3>
                    <ng-container *ngTemplateOutlet="subgrupoNatureza; context: { $implicit: grupo.receitas }" />
                  </div>
                }

                @if (totalSubgrupo(grupo.despesas) > 0) {
                  <div class="flex flex-col gap-2.5">
                    <h3 class="px-1 text-xs font-semibold uppercase tracking-wide text-critical">Despesas</h3>
                    <ng-container *ngTemplateOutlet="subgrupoNatureza; context: { $implicit: grupo.despesas }" />
                  </div>
                }
              }
            </div>
          } @empty {
            <app-card class="text-sm text-muted-foreground">Nenhum lançamento neste mês.</app-card>
          }
        </div>
      } @else {
        <div class="flex flex-col gap-2">
          @for (l of lancamentosService.lancamentos(); track l.id) {
            <ng-container *ngTemplateOutlet="linhaLancamento; context: { $implicit: l }" />
          } @empty {
            <app-card class="text-sm text-muted-foreground">Nenhum lançamento neste mês.</app-card>
          }
        </div>
      }

      @if (detalhe(); as d) {
        <div class="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[12vh]" (click)="fecharDetalhe()">
          <div class="w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-lg" (click)="$event.stopPropagation()">
            <div class="flex items-center justify-between">
              <h2 class="flex items-center gap-2 text-sm font-semibold">
                <lucide-angular [name]="d.recorrenciaId ? 'repeat' : 'layers'" [size]="16" />
                {{ d.recorrenciaId ? 'Ocorrências da recorrência' : 'Parcelas' }}
              </h2>
              <button appButton variant="ghost" size="icon" type="button" (click)="fecharDetalhe()" aria-label="Fechar">
                <lucide-angular name="x" [size]="16" />
              </button>
            </div>

            <div class="mt-3 flex flex-col gap-1.5 text-sm">
              <div class="flex justify-between">
                <span class="text-muted-foreground">Total de {{ d.recorrenciaId ? 'ocorrências' : 'parcelas' }}</span>
                <span class="font-medium">{{ d.itens.length }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted-foreground">Pagas</span>
                <span class="font-medium text-success">{{ contarPagas(d.itens) }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted-foreground">Restante a pagar</span>
                <span class="font-medium">{{ somaRestante(d.itens) | number: '1.2-2' }}</span>
              </div>
            </div>

            <div class="mt-3 flex max-h-80 flex-col gap-1 overflow-y-auto">
              @for (item of d.itens; track item.id) {
                <div class="flex items-center justify-between rounded-md px-2 py-1.5 text-sm" [class]="ehFuturo(item) ? 'bg-muted/50' : ''">
                  <div class="flex items-center gap-2">
                    @if (item.parcelaTotal) {
                      <span class="w-8 shrink-0 tabular-nums text-xs text-muted-foreground">{{ item.parcelaAtual }}/{{ item.parcelaTotal }}</span>
                    }
                    <span>{{ formatarData(item.data) }}</span>
                    @if (ehFuturo(item)) {
                      <span class="text-xs text-muted-foreground">(futuro)</span>
                    }
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="tabular-nums">{{ item.valor | number: '1.2-2' }}</span>
                    <app-badge [variant]="item.status === 'pago' ? 'success' : 'warning'">{{ item.status }}</app-badge>
                  </div>
                </div>
              }
            </div>

            @if (d.recorrenciaId; as recorrenciaId) {
              <button appButton variant="outline" class="mt-4 w-full text-critical" type="button" (click)="pararRecorrenciaDetalhe(recorrenciaId)">
                Parar recorrência (remove ocorrências futuras)
              </button>
            }
          </div>
        </div>
      }
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
  readonly repeticaoOriginalEdicao = signal<'nenhuma' | 'parcelado' | 'recorrente'>('nenhuma');
  readonly detalhe = signal<{ itens: Lancamento[]; recorrenciaId: string | null } | null>(null);
  readonly modoAgrupamento = signal<'nenhuma' | 'pessoa' | 'cartao'>('nenhuma');
  readonly gruposColapsados = signal<ReadonlySet<string>>(new Set());
  readonly opcoesParcelas = [2, 3, 4, 6, 10, 12, 18, 24];
  readonly opcoesRecorrencia = [3, 6, 12, 24, 36];

  /** Agrupa os lançamentos do mês por uma chave qualquer (responsável, cartão...), já
   * separando cada grupo em receitas/despesas e, dentro delas, em avulsas/parceladas/recorrentes. */
  private agrupar(
    categorias: { chave: string; titulo: string; cor: string; subtitulo?: string }[],
    chaveDe: (l: Lancamento) => string | null,
    tituloSemChave: string,
  ) {
    const criarSubgrupo = () => ({ avulsos: [] as Lancamento[], parcelados: [] as Lancamento[], recorrentes: [] as Lancamento[] });
    const criarGrupo = (c: { chave: string; titulo: string; cor: string; subtitulo?: string }) => ({
      ...c,
      receitas: criarSubgrupo(),
      despesas: criarSubgrupo(),
      totalReceitas: 0,
      totalDespesas: 0,
      saldo: 0,
    });
    const grupos = categorias.map(criarGrupo);
    const semChave = criarGrupo({ chave: '_sem', titulo: tituloSemChave, cor: '#8A8698' });

    for (const l of this.lancamentosService.lancamentos()) {
      const grupo = grupos.find((g) => g.chave === chaveDe(l)) ?? semChave;
      const subgrupo = l.tipo === 'receita' ? grupo.receitas : grupo.despesas;
      const natureza = l.recorrenciaId ? subgrupo.recorrentes : l.grupoParcelamentoId ? subgrupo.parcelados : subgrupo.avulsos;
      natureza.push(l);
      if (l.tipo === 'receita') grupo.totalReceitas += l.valor;
      else grupo.totalDespesas += l.valor;
      grupo.saldo = grupo.totalReceitas - grupo.totalDespesas;
    }

    return [...grupos, semChave].filter((g) => this.totalSubgrupo(g.receitas) + this.totalSubgrupo(g.despesas) > 0);
  }

  readonly gruposPorResponsavel = computed(() =>
    this.agrupar(
      this.responsaveis.map((r) => ({ chave: r.id, titulo: r.nome, cor: r.cor })),
      (l) => l.responsavelId,
      'Sem responsável',
    ),
  );

  readonly gruposPorCartao = computed(() =>
    this.agrupar(
      this.cartoesService.cartoes().map((c) => ({ chave: c.id, titulo: c.nome, cor: c.cor, subtitulo: `${c.banco} • ${c.bandeira}` })),
      (l) => l.cartaoId,
      'Sem cartão',
    ),
  );

  readonly gruposParaExibir = computed(() => {
    const modo = this.modoAgrupamento();
    if (modo === 'pessoa') return this.gruposPorResponsavel();
    if (modo === 'cartao') return this.gruposPorCartao();
    return [];
  });

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
      parcelaInicial: [1],
    },
    { validators: zodValidator(lancamentoSchema) },
  );

  constructor() {
    // Quando a busca global manda destacar um lançamento, rola até ele assim que a
    // lista do mês certo termina de carregar e remove o destaque depois de um tempo.
    effect(() => {
      const id = this.lancamentosService.destacarId();
      const lista = this.lancamentosService.lancamentos();
      if (!id || !lista.some((l) => l.id === id)) return;

      queueMicrotask(() => {
        document.getElementById('lancamento-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      setTimeout(() => this.lancamentosService.destacarId.set(null), 2500);
    });
  }

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

  cartaoPor(id: string | null) {
    return id ? this.cartoesService.cartoes().find((c) => c.id === id) : undefined;
  }

  totalSubgrupo(sub: { avulsos: Lancamento[]; parcelados: Lancamento[]; recorrentes: Lancamento[] }): number {
    return sub.avulsos.length + sub.parcelados.length + sub.recorrentes.length;
  }

  /** Recolhe/expande a seção de uma pessoa ou cartão na visão agrupada, pra dar pra bater o
   * olho rápido em todo mundo sem precisar rolar por cada lançamento de cada um. */
  alternarColapso(chave: string): void {
    const atual = new Set(this.gruposColapsados());
    if (atual.has(chave)) atual.delete(chave);
    else atual.add(chave);
    this.gruposColapsados.set(atual);
  }

  estaColapsado(chave: string): boolean {
    return this.gruposColapsados().has(chave);
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
        repeticao: v.repeticao,
        quantidade: v.quantidade,
        parcelaInicial: v.parcelaInicial,
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
        parcelaInicial: v.parcelaInicial,
      });
    }
    this.form.patchValue({ descricao: '', valor: 0, observacao: '', repeticao: 'nenhuma', quantidade: 2, parcelaInicial: 1 });
  }

  editar(l: Lancamento): void {
    this.editandoId.set(l.id);
    const repeticaoAtual: 'nenhuma' | 'parcelado' | 'recorrente' = l.recorrenciaId
      ? 'recorrente'
      : l.grupoParcelamentoId
        ? 'parcelado'
        : 'nenhuma';
    this.repeticaoOriginalEdicao.set(repeticaoAtual);
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
      repeticao: repeticaoAtual,
      quantidade: l.parcelaTotal ?? 2,
      parcelaInicial: l.parcelaAtual ?? 1,
    });
  }

  /** Enquanto edita, só mostra os campos de quantidade quando o usuário realmente muda a
   * repetição em relação ao que o lançamento já tinha — trocar a quantidade sem mudar o
   * modo não altera o grupo inteiro (ver LancamentosService.atualizar). */
  mostrarQuantidade(): boolean {
    return !this.editandoId() || this.form.value.repeticao !== this.repeticaoOriginalEdicao();
  }

  cancelarEdicao(): void {
    this.editandoId.set(null);
    this.repeticaoOriginalEdicao.set('nenhuma');
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
      parcelaInicial: 1,
    });
  }

  async verDetalhe(l: Lancamento): Promise<void> {
    if (l.grupoParcelamentoId) {
      const itens = await this.lancamentosService.buscarGrupoParcelamento(l.grupoParcelamentoId);
      this.detalhe.set({ itens, recorrenciaId: null });
    } else if (l.recorrenciaId) {
      const itens = await this.lancamentosService.buscarRecorrencia(l.recorrenciaId);
      this.detalhe.set({ itens, recorrenciaId: l.recorrenciaId });
    }
  }

  fecharDetalhe(): void {
    this.detalhe.set(null);
  }

  contarPagas(itens: Lancamento[]): number {
    return itens.filter((i) => i.status === 'pago').length;
  }

  somaRestante(itens: Lancamento[]): number {
    return itens.filter((i) => i.status !== 'pago').reduce((soma, i) => soma + i.valor, 0);
  }

  ehFuturo(item: Lancamento): boolean {
    return parseDataLocal(item.data.slice(0, 10)) > new Date();
  }

  async pararRecorrenciaDetalhe(recorrenciaId: string): Promise<void> {
    if (confirm('Isso remove as próximas ocorrências ainda não vencidas desta recorrência. O que já passou/foi pago continua no histórico. Continuar?')) {
      await this.lancamentosService.removerRecorrencia(recorrenciaId);
      this.fecharDetalhe();
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
