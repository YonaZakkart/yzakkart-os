import { BrowserApp } from '../apps/BrowserApp';
import { TerminalApp } from '../apps/TerminalApp';
import type { App } from './App';
import type { ContextoOS } from './contexto';

export interface DefinicionApp {
  id: string;
  titulo: string;
  icono: string;
  crear: (ctx: ContextoOS) => App;
}

export const APPS: DefinicionApp[] = [
  {
    id: 'navegador',
    titulo: 'Navegador',
    icono: 'navegador',
    crear: (ctx) => new BrowserApp(ctx),
  },
  {
    id: 'terminal',
    titulo: 'Terminal',
    icono: 'terminal',
    crear: (ctx) => new TerminalApp(ctx),
  },
];

export function definicionDe(id: string): DefinicionApp | undefined {
  return APPS.find((app) => app.id === id);
}
