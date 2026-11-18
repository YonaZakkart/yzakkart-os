import type { VercelRequest, VercelResponse } from '@vercel/node';
import { esPropietario, requireUser } from '../lib/auth';
import { getDb } from '../lib/db';
import { conManejoDeErrores, entero, fail, leerCuerpo, ok, texto } from '../lib/http';
import {
  LIMITES,
  parsearListaIds,
  validarCuerpo,
  validarImagen,
  validarTitulo,
} from '../lib/validate';
import type { Publicacion } from '../src/models/types';

interface FilaPost {
  id: number;
  user_id: number;
  username: string;
  title: string;
  body: string;
  hasImage: number;
  created_at: string;
  updated_at: string | null;
}

const CAMPOS_POST = `p.id, p.user_id, p.title, p.body, (p.image IS NOT NULL) AS hasImage,
       p.created_at, p.updated_at, u.username`;

function marcadores(cantidad: number): string {
  return Array.from({ length: cantidad }, () => '?').join(',');
}

async function conteosDeReacciones(ids: number[]): Promise<Map<number, Record<string, number>>> {
  const mapa = new Map<number, Record<string, number>>();
  if (ids.length === 0) return mapa;

  const resultado = await getDb().execute({
    sql: `SELECT post_id, kind, COUNT(*) AS total
          FROM post_reactions WHERE post_id IN (${marcadores(ids.length)})
          GROUP BY post_id, kind`,
    args: ids,
  });

  for (const fila of resultado.rows) {
    const id = Number(fila.post_id);
    const actual = mapa.get(id) ?? {};
    actual[String(fila.kind)] = Number(fila.total);
    mapa.set(id, actual);
  }
  return mapa;
}

async function conteosDeComentarios(ids: number[]): Promise<Map<number, number>> {
  const mapa = new Map<number, number>();
  if (ids.length === 0) return mapa;

  const resultado = await getDb().execute({
    sql: `SELECT post_id, COUNT(*) AS total FROM comments
          WHERE post_id IN (${marcadores(ids.length)}) GROUP BY post_id`,
    args: ids,
  });

  for (const fila of resultado.rows) {
    mapa.set(Number(fila.post_id), Number(fila.total));
  }
  return mapa;
}

function armarPublicacion(
  fila: FilaPost,
  reacciones: Map<number, Record<string, number>>,
  comentarios: Map<number, number>,
): Publicacion {
  const id = Number(fila.id);
  return {
    id,
    user_id: Number(fila.user_id),
    username: String(fila.username),
    title: String(fila.title),
    body: String(fila.body),
    hasImage: Number(fila.hasImage) === 1,
    created_at: String(fila.created_at),
    updated_at: fila.updated_at ? String(fila.updated_at) : null,
    reactiones: reacciones.get(id) ?? {},
    comentarios: comentarios.get(id) ?? 0,
  };
}

async function listar(req: VercelRequest, res: VercelResponse): Promise<void> {
  const limitePedido = entero(req.query.limit) ?? LIMITES.lotePorDefecto;
  const limite = Math.min(Math.max(limitePedido, 1), LIMITES.loteMax);
  const excluir = parsearListaIds(req.query.exclude);
  const db = getDb();

  const consulta = (excluyendo: number[]) => {
    const filtro =
      excluyendo.length > 0 ? `WHERE p.id NOT IN (${marcadores(excluyendo.length)})` : '';
    return db.execute({
      sql: `SELECT ${CAMPOS_POST}
            FROM posts p JOIN users u ON u.id = p.user_id
            ${filtro}
            ORDER BY RANDOM() LIMIT ?`,
      args: [...excluyendo, limite],
    });
  };

  let resultado = await consulta(excluir);
  if (resultado.rows.length === 0 && excluir.length > 0) {
    resultado = await consulta([]);
  }

  const filas = resultado.rows as unknown as FilaPost[];
  const ids = filas.map((f) => Number(f.id));
  const [reacciones, comentarios] = await Promise.all([
    conteosDeReacciones(ids),
    conteosDeComentarios(ids),
  ]);

  const posts = filas
    .map((f) => armarPublicacion(f, reacciones, comentarios))
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  ok(res, { posts });
}

async function detalle(req: VercelRequest, res: VercelResponse): Promise<void> {
  const id = entero(req.query.id);
  if (!id) {
    fail(res, 'SOLICITUD_INVALIDA', 'Falta el identificador de la publicación.', 400);
    return;
  }

  const resultado = await getDb().execute({
    sql: `SELECT ${CAMPOS_POST} FROM posts p JOIN users u ON u.id = p.user_id WHERE p.id = ?`,
    args: [id],
  });
  const fila = resultado.rows[0] as unknown as FilaPost | undefined;
  if (!fila) {
    fail(res, 'NO_ENCONTRADO', 'Esa publicación no existe.', 404);
    return;
  }

  const [reacciones, comentarios] = await Promise.all([
    conteosDeReacciones([id]),
    conteosDeComentarios([id]),
  ]);
  ok(res, { post: armarPublicacion(fila, reacciones, comentarios) });
}

async function estadisticas(res: VercelResponse): Promise<void> {
  const resultado = await getDb().execute(`SELECT
    (SELECT COUNT(*) FROM posts) AS posts,
    (SELECT COUNT(*) FROM comments) AS comments,
    (SELECT COUNT(*) FROM post_reactions) + (SELECT COUNT(*) FROM comment_reactions) AS reactions,
    (SELECT COUNT(*) FROM users) AS users`);
  const fila = resultado.rows[0];
  ok(res, {
    stats: {
      posts: Number(fila?.posts ?? 0),
      comments: Number(fila?.comments ?? 0),
      reactions: Number(fila?.reactions ?? 0),
      users: Number(fila?.users ?? 0),
    },
  });
}

async function crear(req: VercelRequest, res: VercelResponse): Promise<void> {
  const usuario = await requireUser(req, res);
  if (!usuario) return;

  const cuerpo = leerCuerpo(req);
  const title = texto(cuerpo.title).trim();
  const body = texto(cuerpo.body).trim();
  const imagen = texto(cuerpo.image);

  const error = validarTitulo(title) ?? validarCuerpo(body);
  if (error) {
    fail(res, 'VALIDACION', error, 400);
    return;
  }

  let dataUrl: string | null = null;
  if (imagen) {
    const valida = validarImagen(imagen);
    if (typeof valida === 'string') {
      fail(
        res,
        valida.includes('límite') ? 'DEMASIADO_GRANDE' : 'TIPO_NO_SOPORTADO',
        valida,
        valida.includes('límite') ? 413 : 415,
      );
      return;
    }
    dataUrl = imagen;
  }

  const insert = await getDb().execute({
    sql: 'INSERT INTO posts (user_id, title, body, image) VALUES (?, ?, ?, ?)',
    args: [usuario.id, title, body, dataUrl],
  });

  const id = Number(insert.lastInsertRowid);
  const resultado = await getDb().execute({
    sql: `SELECT ${CAMPOS_POST} FROM posts p JOIN users u ON u.id = p.user_id WHERE p.id = ?`,
    args: [id],
  });
  const fila = resultado.rows[0] as unknown as FilaPost;
  ok(res, { post: armarPublicacion(fila, new Map(), new Map()) }, 201);
}

async function editar(req: VercelRequest, res: VercelResponse): Promise<void> {
  const usuario = await requireUser(req, res);
  if (!usuario) return;

  const id = entero(req.query.id);
  if (!id) {
    fail(res, 'SOLICITUD_INVALIDA', 'Falta el identificador de la publicación.', 400);
    return;
  }

  const db = getDb();
  const actual = await db.execute({
    sql: 'SELECT user_id FROM posts WHERE id = ?',
    args: [id],
  });
  const duenio = actual.rows[0];
  if (!duenio) {
    fail(res, 'NO_ENCONTRADO', 'Esa publicación no existe.', 404);
    return;
  }
  if (!esPropietario(Number(duenio.user_id), usuario, res)) return;

  const cuerpo = leerCuerpo(req);
  const asignaciones: string[] = [];
  const args: (string | number | null)[] = [];

  if (cuerpo.title !== undefined) {
    const title = texto(cuerpo.title).trim();
    const error = validarTitulo(title);
    if (error) {
      fail(res, 'VALIDACION', error, 400);
      return;
    }
    asignaciones.push('title = ?');
    args.push(title);
  }

  if (cuerpo.body !== undefined) {
    const body = texto(cuerpo.body).trim();
    const error = validarCuerpo(body);
    if (error) {
      fail(res, 'VALIDACION', error, 400);
      return;
    }
    asignaciones.push('body = ?');
    args.push(body);
  }

  if (cuerpo.image !== undefined) {
    const imagen = texto(cuerpo.image);
    if (imagen === '') {
      asignaciones.push('image = NULL');
    } else {
      const valida = validarImagen(imagen);
      if (typeof valida === 'string') {
        const pesada = valida.includes('límite');
        fail(res, pesada ? 'DEMASIADO_GRANDE' : 'TIPO_NO_SOPORTADO', valida, pesada ? 413 : 415);
        return;
      }
      asignaciones.push('image = ?');
      args.push(imagen);
    }
  }

  if (asignaciones.length === 0) {
    fail(res, 'SOLICITUD_INVALIDA', 'No hay cambios que guardar.', 400);
    return;
  }

  asignaciones.push('updated_at = CURRENT_TIMESTAMP');
  await db.execute({
    sql: `UPDATE posts SET ${asignaciones.join(', ')} WHERE id = ?`,
    args: [...args, id],
  });

  const resultado = await db.execute({
    sql: `SELECT ${CAMPOS_POST} FROM posts p JOIN users u ON u.id = p.user_id WHERE p.id = ?`,
    args: [id],
  });
  const fila = resultado.rows[0] as unknown as FilaPost;
  const [reacciones, comentarios] = await Promise.all([
    conteosDeReacciones([id]),
    conteosDeComentarios([id]),
  ]);
  ok(res, { post: armarPublicacion(fila, reacciones, comentarios) });
}

async function eliminar(req: VercelRequest, res: VercelResponse): Promise<void> {
  const usuario = await requireUser(req, res);
  if (!usuario) return;

  const id = entero(req.query.id);
  if (!id) {
    fail(res, 'SOLICITUD_INVALIDA', 'Falta el identificador de la publicación.', 400);
    return;
  }

  const db = getDb();
  const actual = await db.execute({
    sql: 'SELECT user_id FROM posts WHERE id = ?',
    args: [id],
  });
  const duenio = actual.rows[0];
  if (!duenio) {
    fail(res, 'NO_ENCONTRADO', 'Esa publicación no existe.', 404);
    return;
  }
  if (!esPropietario(Number(duenio.user_id), usuario, res)) return;

  await db.batch(
    [
      {
        sql: 'DELETE FROM comment_reactions WHERE comment_id IN (SELECT id FROM comments WHERE post_id = ?)',
        args: [id],
      },
      { sql: 'DELETE FROM comments WHERE post_id = ?', args: [id] },
      { sql: 'DELETE FROM post_reactions WHERE post_id = ?', args: [id] },
      { sql: 'DELETE FROM posts WHERE id = ?', args: [id] },
    ],
    'write',
  );

  ok(res, { ok: true });
}

async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const accion = texto(req.query.action);

  if (req.method === 'GET') {
    switch (accion) {
      case 'detail':
        return detalle(req, res);
      case 'stats':
        return estadisticas(res);
      default:
        return listar(req, res);
    }
  }

  switch (req.method) {
    case 'POST':
      return crear(req, res);
    case 'PATCH':
    case 'PUT':
      return editar(req, res);
    case 'DELETE':
      return eliminar(req, res);
    default:
      fail(res, 'METODO_NO_PERMITIDO', 'Método no permitido.', 405);
  }
}

export default conManejoDeErrores(handler);
