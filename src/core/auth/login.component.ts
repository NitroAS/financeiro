import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-background p-4">
      <div class="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-lg">
        <div class="mb-4 flex items-center gap-2">
          <span class="h-2.5 w-2.5 rounded-full bg-primary"></span>
          <h1 class="text-sm font-semibold tracking-tight">financeiro</h1>
        </div>

        @if (!auth.configurado) {
          <p class="text-sm text-critical">
            Supabase não configurado — defina SUPABASE_URL e SUPABASE_ANON_KEY no ambiente de build.
          </p>
        } @else {
          <form [formGroup]="form" (ngSubmit)="entrar()" class="flex flex-col gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted-foreground">E-mail da família</label>
              <input
                type="email"
                formControlName="email"
                class="h-9 rounded-md border border-border bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted-foreground">Senha</label>
              <input
                type="password"
                formControlName="senha"
                class="h-9 rounded-md border border-border bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            @if (erro()) {
              <p class="text-xs text-critical">{{ erro() }}</p>
            }

            <button
              type="submit"
              [disabled]="form.invalid || entrando()"
              class="mt-1 h-9 rounded-md bg-primary text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {{ entrando() ? 'Entrando...' : 'Entrar' }}
            </button>
          </form>
        }
      </div>
    </div>
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);

  readonly erro = signal<string | null>(null);
  readonly entrando = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', Validators.required],
  });

  async entrar(): Promise<void> {
    if (this.form.invalid) return;
    this.entrando.set(true);
    this.erro.set(null);
    const { email, senha } = this.form.getRawValue();
    const erro = await this.auth.entrar(email, senha);
    this.entrando.set(false);
    if (erro) this.erro.set('E-mail ou senha incorretos.');
  }
}
