import { Directive, HostBinding, input } from '@angular/core';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ' +
    'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
    'disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:opacity-90',
        outline: 'border border-border bg-transparent hover:bg-muted',
        ghost: 'bg-transparent hover:bg-muted',
        destructive: 'bg-critical text-white hover:opacity-90',
      },
      size: {
        default: 'h-9 px-4',
        sm: 'h-8 px-3 text-[13px]',
        lg: 'h-10 px-6',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;

/** Aplique em <button appButton> ou <a appButton> para o visual padrão do design system. */
@Directive({
  selector: '[appButton]',
  standalone: true,
})
export class ButtonDirective {
  readonly variant = input<ButtonVariants['variant']>('default');
  readonly size = input<ButtonVariants['size']>('default');

  @HostBinding('class')
  get hostClass(): string {
    return cn(buttonVariants({ variant: this.variant(), size: this.size() }));
  }
}
