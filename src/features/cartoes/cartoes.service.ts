import { Injectable, inject, signal } from '@angular/core';
import { eq } from 'drizzle-orm';
import { DbService } from '../../core/db/db.service';
import { cartao } from '../../core/db/schema';

export type Cartao = typeof cartao.$inferSelect;
export type NovoCartao = typeof cartao.$inferInsert;

@Injectable({ providedIn: 'root' })
export class CartoesService {
  private readonly dbService = inject(DbService);

  readonly cartoes = signal<Cartao[]>([]);

  async carregar(): Promise<void> {
    const rows = await this.dbService.db.select().from(cartao).orderBy(cartao.nome);
    this.cartoes.set(rows);
  }

  async criar(valores: NovoCartao): Promise<void> {
    await this.dbService.db.insert(cartao).values(valores);
    await this.carregar();
  }

  async remover(id: string): Promise<void> {
    await this.dbService.db.delete(cartao).where(eq(cartao.id, id));
    await this.carregar();
  }
}
