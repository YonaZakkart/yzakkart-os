export interface Fondo {
  id: string;
  nombre: string;
  archivo: string;
}

export const FONDOS: Fondo[] = [
  { id: 'circuito', nombre: 'Circuito dorado', archivo: '/wallpapers/01-yzakkart.jpg' },
  { id: 'ondas', nombre: 'Ondas de neón', archivo: '/wallpapers/02-yzakkart.jpg' },
  { id: 'sierra', nombre: 'Sierra nocturna', archivo: '/wallpapers/03-yzakkart.jpg' },
];

const CLAVE = 'yzakkart.wallpaper';

export function fondoGuardado(): Fondo {
  const id = localStorage.getItem(CLAVE);
  return FONDOS.find((f) => f.id === id) ?? FONDOS[0];
}

export function guardarFondo(id: string): Fondo | null {
  const fondo = FONDOS.find((f) => f.id === id);
  if (!fondo) return null;
  try {
    localStorage.setItem(CLAVE, fondo.id);
  } catch {
    /* almacenamiento bloqueado: se usa solo en memoria */
  }
  return fondo;
}
