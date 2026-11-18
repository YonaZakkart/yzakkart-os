import type {
  Comentario,
  Estadisticas,
  OrdenFeed,
  Publicacion,
  SesionIniciada,
  Usuario,
} from '../models/types';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let token: string | null = null;

export function guardarToken(nuevo: string | null): void {
  token = nuevo;
}

async function pedir<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const cabeceras = new Headers(init.headers);
  if (init.body) cabeceras.set('Content-Type', 'application/json');
  if (token) cabeceras.set('Authorization', `Bearer ${token}`);

  let respuesta: Response;
  try {
    respuesta = await fetch(ruta, { ...init, headers: cabeceras });
  } catch {
    throw new ApiError('No hay conexión con el servidor.', 'SIN_CONEXION', 0);
  }

  let cuerpo: { ok: boolean; data?: T; error?: { code: string; message: string } } | null = null;
  try {
    cuerpo = await respuesta.json();
  } catch {
    cuerpo = null;
  }

  if (!respuesta.ok || !cuerpo?.ok) {
    throw new ApiError(
      cuerpo?.error?.message ?? 'Algo salió mal. Intenta de nuevo.',
      cuerpo?.error?.code ?? 'ERROR_DESCONOCIDO',
      respuesta.status,
    );
  }

  return cuerpo.data as T;
}

export const api = {
  /* --- Sesión --- */
  invitado: () => pedir<SesionIniciada>('/api/auth?action=guest', { method: 'POST' }),
  me: () => pedir<{ user: Usuario }>('/api/auth?action=me'),
  registro: (username: string, password: string, email: string) =>
    pedir<{ code: string; expiresAt: string; email: string }>('/api/auth?action=register', {
      method: 'POST',
      body: JSON.stringify({ username, password, email }),
    }),
  verificar: (code: string) =>
    pedir<SesionIniciada>('/api/auth?action=verify', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
  reenviar: () =>
    pedir<{ code: string; expiresAt: string }>('/api/auth?action=reenviar', { method: 'POST' }),
  insignia: (metodo: 'token' | 'estrella', token?: string) =>
    pedir<{ user: Usuario }>('/api/auth?action=insignia', {
      method: 'POST',
      body: JSON.stringify({ metodo, ...(token ? { token } : {}) }),
    }),
  login: (username: string, password: string) =>
    pedir<SesionIniciada>('/api/auth?action=login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  salir: () => pedir<{ ok: boolean }>('/api/auth?action=logout', { method: 'POST' }),

  /* --- Publicaciones --- */
  listarPosts: (exclude: number[] = [], limit = 10, order: OrdenFeed = 'recientes') => {
    const parametros = new URLSearchParams({
      action: 'list',
      limit: String(limit),
      order,
    });
    if (exclude.length > 0) parametros.set('exclude', exclude.join(','));
    return pedir<{ posts: Publicacion[] }>(`/api/posts?${parametros.toString()}`);
  },
  detallePost: (id: number) => pedir<{ post: Publicacion }>(`/api/posts?action=detail&id=${id}`),
  estadisticas: () => pedir<{ stats: Estadisticas }>('/api/posts?action=stats'),
  crearPost: (title: string, body: string, image?: string) =>
    pedir<{ post: Publicacion }>('/api/posts', {
      method: 'POST',
      body: JSON.stringify({ title, body, ...(image ? { image } : {}) }),
    }),
  editarPost: (id: number, cambios: { title?: string; body?: string; image?: string }) =>
    pedir<{ post: Publicacion }>(`/api/posts?id=${id}`, {
      method: 'PATCH',
      body: JSON.stringify(cambios),
    }),
  eliminarPost: (id: number) => pedir<{ ok: boolean }>(`/api/posts?id=${id}`, { method: 'DELETE' }),

  /* --- Comentarios --- */
  listarComentarios: (postId: number) =>
    pedir<{ comments: Comentario[] }>(`/api/comments?postId=${postId}`),
  crearComentario: (postId: number, body: string) =>
    pedir<{ comment: Comentario }>('/api/comments', {
      method: 'POST',
      body: JSON.stringify({ postId, body }),
    }),
  editarComentario: (id: number, body: string) =>
    pedir<{ comment: Comentario }>(`/api/comments?id=${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ body }),
    }),
  eliminarComentario: (id: number) =>
    pedir<{ ok: boolean }>(`/api/comments?id=${id}`, { method: 'DELETE' }),

  /* --- Reacciones --- */
  reaccionar: (target: 'post' | 'comment', id: number, kind: string) =>
    pedir<{ reaction: string; counts: Record<string, number> }>('/api/reactions?action=set', {
      method: 'POST',
      body: JSON.stringify({ target, id, kind }),
    }),
  quitarReaccion: (target: 'post' | 'comment', id: number) =>
    pedir<{ counts: Record<string, number> }>('/api/reactions?action=remove', {
      method: 'POST',
      body: JSON.stringify({ target, id }),
    }),
};

export function urlImagen(id: number, tamano: 'thumb' | 'full' = 'full'): string {
  return `/api/image?id=${id}&w=${tamano}`;
}
