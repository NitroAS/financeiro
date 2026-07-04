import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-progress',
  standalone: true,
  template: `
    <div class="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        class="h-full rounded-full transition-[width] duration-300"
        [class]="over() ? 'bg-critical' : 'bg-primary'"
        [style.width.%]="pct()"
      ></div>
    </div>
  `,
})
export class ProgressComponent {
  readonly value = input(0);
  readonly max = input(100);

  readonly pct = computed(() => Math.min(100, Math.max(0, (this.value() / (this.max() || 1)) * 100)));
  readonly over = computed(() => this.value() > this.max());
}
