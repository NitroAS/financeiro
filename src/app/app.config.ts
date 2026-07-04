import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  LucideAngularModule,
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  CreditCard,
  Tags,
  PieChart,
  Target,
  TrendingUp,
  CalendarDays,
  FileBarChart2,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
} from 'lucide-angular';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    importProvidersFrom(
      LucideAngularModule.pick({
        LayoutDashboard,
        ArrowLeftRight,
        Wallet,
        CreditCard,
        Tags,
        PieChart,
        Target,
        TrendingUp,
        CalendarDays,
        FileBarChart2,
        Sun,
        Moon,
        PanelLeftClose,
        PanelLeftOpen,
        Search,
      }),
    ),
  ],
};
