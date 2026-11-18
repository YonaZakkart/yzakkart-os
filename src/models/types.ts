export interface Usuario {
  id: number;
  username: string;
  is_guest: 0 | 1;
  badge_gold: 0 | 1;
  badge_yz: 0 | 1;
}

export type OrdenFeed = 'recientes' | 'antiguos' | 'comentados';

export interface Publicacion {
  id: number;
  user_id: number;
  username: string;
  title: string;
  body: string;
  hasImage: boolean;
  created_at: string;
  updated_at: string | null;
  reactiones: Record<string, number>;
  miReaccion: string | null;
  comentarios: number;
  badge_gold: boolean;
  badge_yz: boolean;
}

export interface Comentario {
  id: number;
  post_id: number;
  user_id: number;
  username: string;
  body: string;
  created_at: string;
  updated_at: string | null;
  reactiones: Record<string, number>;
  miReaccion: string | null;
  badge_gold: boolean;
  badge_yz: boolean;
}

export interface Estadisticas {
  posts: number;
  comments: number;
  reactions: number;
  users: number;
}

export interface RespuestaOk<T> {
  ok: true;
  data: T;
}

export interface RespuestaError {
  ok: false;
  error: { code: string; message: string };
}

export type Respuesta<T> = RespuestaOk<T> | RespuestaError;

export interface SesionIniciada {
  user: Usuario;
  token: string;
}

export const REACCIONES = [
  { kind: 'me_gusta', emoji: '👍', etiqueta: 'Me gusta' },
  { kind: 'me_encanta', emoji: '❤️', etiqueta: 'Me encanta' },
  { kind: 'risa', emoji: '😂', etiqueta: 'Me da risa' },
  { kind: 'sorpresa', emoji: '😮', etiqueta: 'Me sorprende' },
  { kind: 'enojo', emoji: '😠', etiqueta: 'Me molesta' },
] as const;

export type TipoReaccion = (typeof REACCIONES)[number]['kind'];
