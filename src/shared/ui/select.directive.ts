import { Directive, HostBinding } from '@angular/core';
import { cn } from '../utils/cn';

/** Aplique em <select appSelect> para o visual padrão do design system. */
@Directive({
  selector: '[appSelect]',
  standalone: true,
})
export class SelectDirective {
  @HostBinding('class')
  readonly hostClass = cn(
    'h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  );
}
