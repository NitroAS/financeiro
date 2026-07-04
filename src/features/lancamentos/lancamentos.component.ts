import { Component } from '@angular/core';
import { CardComponent } from '../../shared/ui/card.component';
import { BadgeComponent } from '../../shared/ui/badge.component';

@Component({
  selector: 'app-lancamentos',
  standalone: true,
  imports: [CardComponent, BadgeComponent],
  template: `
    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-semibold tracking-tight">Lançamentos</h1>
        <app-badge variant="primary">Etapa 1 do cronograma</app-badge>
      </div>
      <app-card class="text-sm text-muted-foreground">
        Receitas, despesas, parcelamento automático e recorrência.
      </app-card>
    </div>
  `,
})
export class LancamentosComponent {}
