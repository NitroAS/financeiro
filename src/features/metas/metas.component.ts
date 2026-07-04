import { Component } from '@angular/core';
import { CardComponent } from '../../shared/ui/card.component';
import { BadgeComponent } from '../../shared/ui/badge.component';

@Component({
  selector: 'app-metas',
  standalone: true,
  imports: [CardComponent, BadgeComponent],
  template: `
    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-semibold tracking-tight">Metas</h1>
        <app-badge variant="primary">Etapa 4 do cronograma</app-badge>
      </div>
      <app-card class="text-sm text-muted-foreground">
        Reserva de emergência, viagem, casa, carro — com previsão.
      </app-card>
    </div>
  `,
})
export class MetasComponent {}
