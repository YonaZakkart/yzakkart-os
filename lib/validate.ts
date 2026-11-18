import { REACCIONES } from '../src/models/types';

/**
 * Validaciones puras: sin red, sin base de datos, testeables con Vitest.
 * Cada función devuelve `null` si el valor es válido o el mensaje de error.
 */

export const LIMITES = {
  usuarioMin: 3,
  usuarioMax: 20,
  passwordMin: 6,
  passwordMax: 72,
  tituloMin: 3,
  tituloMax: 120,
  cuerpoMax: 5000,
  comentarioMax: 1000,
  imagenBytes: 200 * 1024,
  loteMax: 30,
  lotePorDefecto: 10,
} as const;

const REUSUARIO = /^[A-Za-z0-9_]+$/;
const REEMAIL = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
const REIMAGEN = /^data:image\/(webp|jpeg|png);base64,([A-Za-z0-9+/=]+)$/;

export function validarUsuario(valor: string): string | null {
  const v = valor.trim();
  if (v.length < LIMITES.usuarioMin || v.length > LIMITES.usuarioMax) {
    return `El usuario debe tener entre ${LIMITES.usuarioMin} y ${LIMITES.usuarioMax} caracteres.`;
  }
  if (!REUSUARIO.test(v)) {
    return 'El usuario solo admite letras, números y guion bajo.';
  }
  return null;
}

export function validarPassword(valor: string): string | null {
  if (valor.length < LIMITES.passwordMin) {
    return `La contraseña debe tener al menos ${LIMITES.passwordMin} caracteres.`;
  }
  if (valor.length > LIMITES.passwordMax) {
    return `La contraseña no puede superar ${LIMITES.passwordMax} caracteres.`;
  }
  return null;
}

export function validarEmail(valor: string): string | null {
  if (!REEMAIL.test(valor.trim())) {
    return 'Escribe un correo con formato válido.';
  }
  return null;
}

export function validarTitulo(valor: string): string | null {
  const v = valor.trim();
  if (v.length < LIMITES.tituloMin) {
    return `El título necesita al menos ${LIMITES.tituloMin} caracteres.`;
  }
  if (v.length > LIMITES.tituloMax) {
    return `El título no puede superar ${LIMITES.tituloMax} caracteres.`;
  }
  return null;
}

export function validarCuerpo(valor: string): string | null {
  const v = valor.trim();
  if (v.length === 0) return 'El texto de la publicación no puede estar vacío.';
  if (v.length > LIMITES.cuerpoMax) {
    return `El texto no puede superar ${LIMITES.cuerpoMax} caracteres.`;
  }
  return null;
}

export function validarComentario(valor: string): string | null {
  const v = valor.trim();
  if (v.length === 0) return 'El comentario no puede estar vacío.';
  if (v.length > LIMITES.comentarioMax) {
    return `El comentario no puede superar ${LIMITES.comentarioMax} caracteres.`;
  }
  return null;
}

export interface ImagenValida {
  mime: string;
  bytes: number;
  base64: string;
}

export function validarImagen(valor: string): ImagenValida | string {
  const m = REIMAGEN.exec(valor);
  if (!m) return 'La imagen debe ser WebP, JPEG o PNG.';

  const base64 = m[2];
  const bytes =
    Math.floor((base64.length * 3) / 4) -
    (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0);

  if (bytes > LIMITES.imagenBytes) {
    return `La imagen supera el límite de ${Math.round(LIMITES.imagenBytes / 1024)} KB.`;
  }

  return { mime: `image/${m[1]}`, bytes, base64 };
}

export function esReaccionValida(kind: string): boolean {
  return REACCIONES.some((r) => r.kind === kind);
}

/** Convierte "1,2,3" en [1,2,3] descartando basura y duplicados. */
export function parsearListaIds(valor: unknown): number[] {
  if (typeof valor !== 'string' || valor.trim() === '') return [];
  const ids = valor
    .split(',')
    .map((x) => Number.parseInt(x.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
  return [...new Set(ids)].slice(0, 200);
}
