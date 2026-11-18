import type { Fondo } from './wallpapers';

/** Servicios que el shell ofrece a las aplicaciones. */
export interface ContextoOS {
  abrirApp(id: string): void;
  apagar(): void;
  cambiarFondo(id: string): void;
  fondos(): Fondo[];
  fondoActual(): string;
  usuario(): string;
}
