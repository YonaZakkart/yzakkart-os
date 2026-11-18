import type { Publicacion, Usuario } from '../../models/types';

/** Lo que una vista del blog necesita del contenedor principal. */
export interface ContextoBlog {
  usuario(): Usuario | null;
  alFeed(): void;
  alDetalle(id: number): void;
  alEditor(publicacion?: Publicacion): void;
  alCuenta(): void;
  actualizarEncabezado(): void;
}
