import { Injectable, signal } from '@angular/core';
import { db, ready } from './db.client';

@Injectable({ providedIn: 'root' })
export class DbService {
  readonly isReady = signal(false);
  readonly error = signal<string | null>(null);
  readonly db = db;

  constructor() {
    ready()
      .then(() => this.isReady.set(true))
      .catch((err: unknown) => {
        console.error('[DbService] falha ao iniciar o banco', err);
        this.error.set(err instanceof Error ? err.message : String(err));
      });
  }
}
