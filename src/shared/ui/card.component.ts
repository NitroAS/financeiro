import { Component, input } from '@angular/core';
import { cn } from '../utils/cn';

@Component({
  selector: 'app-card',
  standalone: true,
  template: '<ng-content />',
  host: {
    '[class]': 'hostClass',
  },
})
export class CardComponent {
  readonly class = input<string>('');

  get hostClass(): string {
    return cn('block rounded-lg border border-border bg-card p-4', this.class());
  }
}
