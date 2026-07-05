import { Injectable, inject, signal } from '@angular/core';
import { eq } from '../../core/db/query-builder';
import { DbService } from '../../core/db/db.service';
import { conta } from '../../core/db/schema';

export type Conta = typeof conta.$inferSelect;
export type NovaConta = typeof conta.$inferInsert;

@Injectable({ providedIn: 'root' })
export class ContasService {
  private readonly dbService = inject(DbService);

  readonly contas = signal<Conta[]>([]);
  readonly carregando = signal(false);

  constructor() {
    this.dbService.db.subscribeTable(conta, () => void this.carregar());
  }

  async carregar(): Promise<void> {
    this.carregando.set(true);
    try {
      const rows = await this.dbService.db.select().from(conta).orderBy(conta.nome);
      this.contas.set(rows.filter((c) => !c.arquivada));
    } finally {
      this.carregando.set(false);
    }
  }

  async criar(valores: NovaConta): Promise<void> {
    await this.dbService.db.insert(conta).values(valores);
    await this.carregar();
  }

  async atualizar(id: string, valores: Partial<NovaConta>): Promise<void> {
    await this.dbService.db.update(conta).set(valores).where(eq(conta.id, id));
    await this.carregar();
  }

  async remover(id: string): Promise<void> {
    await this.dbService.db.update(conta).set({ arquivada: true }).where(eq(conta.id, id));
    await this.carregar();
  }
}
