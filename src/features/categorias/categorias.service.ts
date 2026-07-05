import { Injectable, inject, signal } from '@angular/core';
import { eq } from 'drizzle-orm';
import { DbService } from '../../core/db/db.service';
import { categoria } from '../../core/db/schema';

export type Categoria = typeof categoria.$inferSelect;
export type NovaCategoria = typeof categoria.$inferInsert;

@Injectable({ providedIn: 'root' })
export class CategoriasService {
  private readonly dbService = inject(DbService);

  readonly categorias = signal<Categoria[]>([]);

  async carregar(): Promise<void> {
    const rows = await this.dbService.db.select().from(categoria).orderBy(categoria.nome);
    this.categorias.set(rows);
  }

  async criar(valores: NovaCategoria): Promise<void> {
    await this.dbService.db.insert(categoria).values(valores);
    await this.carregar();
  }

  async atualizar(id: string, valores: Partial<NovaCategoria>): Promise<void> {
    await this.dbService.db.update(categoria).set(valores).where(eq(categoria.id, id));
    await this.carregar();
  }

  async remover(id: string): Promise<void> {
    await this.dbService.db.delete(categoria).where(eq(categoria.id, id));
    await this.carregar();
  }
}
