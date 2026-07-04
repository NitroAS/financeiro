export interface NavItem {
  path: string;
  label: string;
  icon: string;
}

export const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
  { path: '/lancamentos', label: 'Lançamentos', icon: 'arrow-left-right' },
  { path: '/contas', label: 'Contas', icon: 'wallet' },
  { path: '/cartoes', label: 'Cartões', icon: 'credit-card' },
  { path: '/categorias', label: 'Categorias', icon: 'tags' },
  { path: '/planejamento', label: 'Planejamento', icon: 'pie-chart' },
  { path: '/metas', label: 'Metas', icon: 'target' },
  { path: '/investimentos', label: 'Investimentos', icon: 'trending-up' },
  { path: '/calendario', label: 'Calendário', icon: 'calendar-days' },
  { path: '/relatorios', label: 'Relatórios', icon: 'file-bar-chart-2' },
];
