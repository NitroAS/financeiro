import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class BuscaStore {
  readonly aberto = signal(false);

  abrir(): void {
    this.aberto.set(true);
  }

  fechar(): void {
    this.aberto.set(false);
  }

  toggle(): void {
    this.aberto.update((v) => !v);
  }
}
