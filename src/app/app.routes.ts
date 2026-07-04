import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    loadComponent: () => import('../features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
    title: 'Dashboard · Financeiro',
  },
  {
    path: 'lancamentos',
    loadComponent: () => import('../features/lancamentos/lancamentos.component').then((m) => m.LancamentosComponent),
    title: 'Lançamentos · Financeiro',
  },
  {
    path: 'contas',
    loadComponent: () => import('../features/contas/contas.component').then((m) => m.ContasComponent),
    title: 'Contas · Financeiro',
  },
  {
    path: 'cartoes',
    loadComponent: () => import('../features/cartoes/cartoes.component').then((m) => m.CartoesComponent),
    title: 'Cartões · Financeiro',
  },
  {
    path: 'categorias',
    loadComponent: () => import('../features/categorias/categorias.component').then((m) => m.CategoriasComponent),
    title: 'Categorias · Financeiro',
  },
  {
    path: 'planejamento',
    loadComponent: () =>
      import('../features/planejamento/planejamento.component').then((m) => m.PlanejamentoComponent),
    title: 'Planejamento · Financeiro',
  },
  {
    path: 'metas',
    loadComponent: () => import('../features/metas/metas.component').then((m) => m.MetasComponent),
    title: 'Metas · Financeiro',
  },
  {
    path: 'investimentos',
    loadComponent: () =>
      import('../features/investimentos/investimentos.component').then((m) => m.InvestimentosComponent),
    title: 'Investimentos · Financeiro',
  },
  {
    path: 'calendario',
    loadComponent: () => import('../features/calendario/calendario.component').then((m) => m.CalendarioComponent),
    title: 'Calendário · Financeiro',
  },
  {
    path: 'relatorios',
    loadComponent: () => import('../features/relatorios/relatorios.component').then((m) => m.RelatoriosComponent),
    title: 'Relatórios · Financeiro',
  },
  { path: '**', redirectTo: 'dashboard' },
];
