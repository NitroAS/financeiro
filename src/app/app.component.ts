import { Component, inject } from '@angular/core';
import { ShellComponent } from './shell/shell.component';
import { AuthService } from '../core/auth/auth.service';
import { LoginComponent } from '../core/auth/login.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ShellComponent, LoginComponent],
  template: `
    @if (auth.carregando()) {
      <div class="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Carregando...
      </div>
    } @else if (auth.sessao()) {
      <app-shell />
    } @else {
      <app-login />
    }
  `,
})
export class AppComponent {
  readonly auth = inject(AuthService);
}
