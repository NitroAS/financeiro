import { Component, input } from '@angular/core';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

export const badgeVariants = cva('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', {
  variants: {
    variant: {
      neutral: 'border border-border text-muted-foreground',
      primary: 'bg-primary-soft text-primary',
      success: 'bg-success-soft text-success',
      warning: 'bg-warning-soft text-warning',
      critical: 'bg-critical-soft text-critical',
    },
  },
  defaultVariants: { variant: 'neutral' },
});

type BadgeVariants = VariantProps<typeof badgeVariants>;

@Component({
  selector: 'app-badge',
  standalone: true,
  template: '<ng-content />',
  host: { '[class]': 'hostClass' },
})
export class BadgeComponent {
  readonly variant = input<BadgeVariants['variant']>('neutral');

  get hostClass(): string {
    return cn(badgeVariants({ variant: this.variant() }));
  }
}
