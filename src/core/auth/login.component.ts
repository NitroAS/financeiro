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
          <div class="flex flex-col gap-3">
            @if (auth.erroAcesso()) {
              <p class="rounded-md bg-critical/10 px-3 py-2 text-xs text-critical">{{ auth.erroAcesso() }}</p>
            }

            <button
              type="button"
              (click)="entrarComGoogle()"
              [disabled]="entrandoGoogle()"
              class="flex h-10 items-center justify-center gap-2 rounded-md border border-border text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.6C29.6 35.4 26.9 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.6 5.1C9.6 39.6 16.3 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.6 5.6C41.9 36 44 30.5 44 24c0-1.3-.1-2.7-.4-3.5z"/>
              </svg>
              {{ entrandoGoogle() ? 'Abrindo o Google...' : 'Entrar com Google' }}
            </button>

            <button
              type="button"
              (click)="mostrarSenha.set(!mostrarSenha())"
              class="text-center text-xs text-muted-foreground underline underline-offset-2"
            >
              {{ mostrarSenha() ? 'Esconder login com e-mail e senha' : 'Entrar com e-mail e senha' }}
            </button>

            @if (mostrarSenha()) {
              <form [formGroup]="form" (ngSubmit)="entrar()" class="flex flex-col gap-3 border-t border-border pt-3">
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-medium text-muted-foreground">E-mail</label>
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
  readonly entrandoGoogle = signal(false);
  readonly mostrarSenha = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', Validators.required],
  });

  async entrarComGoogle(): Promise<void> {
    this.entrandoGoogle.set(true);
    await this.auth.entrarComGoogle();
    this.entrandoGoogle.set(false);
  }

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
