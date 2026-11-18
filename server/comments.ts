import type { VercelRequest, VercelResponse } from '@vercel/node';
import { esPropietario, requireUser, usuarioDeSesion } from '../lib/auth';
import { getDb } from '../lib/db';
import { conManejoDeErrores, entero, fail, leerCuerpo, ok, texto } from '../lib/http';
import { validarComentario } from '../lib/validate';
import type { Comentario } from '../src/models/types';

interface FilaComentario {
  id: number;
  post_id: number;
  user_id: number;
  username: string;
  body: string;
  created_at: string;
  updated_at: string | null;
  badge_gold: number;
  badge_yz: number;
}

const CAMPOS = 'c.id, c.post_id, c.user_id, c.body, c.created_at, c.updated_at, u.username';

function marcadores(cantidad: number): string {
  return Array.from({ length: cantidad }, () => '?').join(',');
}

async function conteos(ids: number[]): Promise<Map<number, Record<string, number>>> {
  const mapa = new Map<number, Record<string, number>>();
  if (ids.length === 0) return mapa;

  const resultado = await getDb().execute({
    sql: `SELECT comment_id, kind, COUNT(*) AS total FROM comment_reactions
          WHERE comment_id IN (${marcadores(ids.length)}) GROUP BY comment_id, kind`,
    args: ids,
  });

  for (const fila of resultado.rows) {
    const id = Number(fila.comment_id);
    const actual = mapa.get(id) ?? {};
    actual[String(fila.kind)] = Number(fila.total);
    mapa.set(id, actual);
  }
  return mapa;
}

async function miasDe(userId: number | undefined, ids: number[]): Promise<Map<number, string>> {
  const mapa = new Map<number, string>();
  if (!userId || ids.length === 0) return mapa;

  const resultado = await getDb().execute({
    sql: `SELECT comment_id, kind FROM comment_reactions
          WHERE user_id = ? AND comment_id IN (${marcadores(ids.length)})`,
    args: [userId, ...ids],
  });

  for (const fila of resultado.rows) {
    mapa.set(Number(fila.comment_id), String(fila.kind));
  }
  return mapa;
}

function armar(
  fila: FilaComentario,
  reacciones: Map<number, Record<string, number>>,
  mias: Map<number, string>,
): Comentario {
  const id = Number(fila.id);
  return {
    id,
    post_id: Number(fila.post_id),
    user_id: Number(fila.user_id),
    username: String(fila.username),
    body: String(fila.body),
    created_at: String(fila.created_at),
    updated_at: fila.updated_at ? String(fila.updated_at) : null,
    reactiones: reacciones.get(id) ?? {},
    miReaccion: mias.get(id) ?? null,
    badge_gold: Number(fila.badge_gold) === 1,
    badge_yz: Number(fila.badge_yz) === 1,
  };
}

async function listar(req: VercelRequest, res: VercelResponse): Promise<void> {
  const postId = entero(req.query.postId);
  if (!postId) {
    fail(res, 'SOLICITUD_INVALIDA', 'Falta la publicación.', 400);
    return;
  }

  const resultado = await getDb().execute({
    sql: `SELECT ${CAMPOS} FROM comments c JOIN users u ON u.id = c.user_id
          WHERE c.post_id = ? ORDER BY c.created_at ASC, c.id ASC`,
    args: [postId],
  });

  const filas = resultado.rows as unknown as FilaComentario[];
  const ids = filas.map((f) => Number(f.id));
  const usuario = await usuarioDeSesion(req);
  const [reacciones, mias] = await Promise.all([conteos(ids), miasDe(usuario?.id, ids)]);
  ok(res, { comments: filas.map((f) => armar(f, reacciones, mias)) });
}

async function crear(req: VercelRequest, res: VercelResponse): Promise<void> {
  const usuario = await requireUser(req, res);
  if (!usuario) return;

  const cuerpo = leerCuerpo(req);
  const postId = entero(cuerpo.postId);
  const body = texto(cuerpo.body).trim();

  if (!postId) {
    fail(res, 'SOLICITUD_INVALIDA', 'Falta la publicación.', 400);
    return;
  }

  const error = validarComentario(body);
  if (error) {
    fail(res, 'VALIDACION', error, 400);
    return;
  }

  const db = getDb();
  const existe = await db.execute({ sql: 'SELECT id FROM posts WHERE id = ?', args: [postId] });
  if (existe.rows.length === 0) {
    fail(res, 'NO_ENCONTRADO', 'Esa publicación no existe.', 404);
    return;
  }

  const insert = await db.execute({
    sql: 'INSERT INTO comments (post_id, user_id, body) VALUES (?, ?, ?)',
    args: [postId, usuario.id, body],
  });

  const id = Number(insert.lastInsertRowid);
  const resultado = await db.execute({
    sql: `SELECT ${CAMPOS} FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?`,
    args: [id],
  });
  ok(
    res,
    { comment: armar(resultado.rows[0] as unknown as FilaComentario, new Map(), new Map()) },
    201,
  );
}

async function editar(req: VercelRequest, res: VercelResponse): Promise<void> {
  const usuario = await requireUser(req, res);
  if (!usuario) return;

  const id = entero(req.query.id);
  if (!id) {
    fail(res, 'SOLICITUD_INVALIDA', 'Falta el comentario.', 400);
    return;
  }

  const db = getDb();
  const actual = await db.execute({
    sql: 'SELECT user_id FROM comments WHERE id = ?',
    args: [id],
  });
  const duenio = actual.rows[0];
  if (!duenio) {
    fail(res, 'NO_ENCONTRADO', 'Ese comentario no existe.', 404);
    return;
  }
  if (!esPropietario(Number(duenio.user_id), usuario, res)) return;

  const body = texto(leerCuerpo(req).body).trim();
  const error = validarComentario(body);
  if (error) {
    fail(res, 'VALIDACION', error, 400);
    return;
  }

  await db.execute({
    sql: 'UPDATE comments SET body = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    args: [body, id],
  });

  const resultado = await db.execute({
    sql: `SELECT ${CAMPOS} FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?`,
    args: [id],
  });
  const [reacciones, mias] = await Promise.all([conteos([id]), miasDe(usuario.id, [id])]);
  ok(res, { comment: armar(resultado.rows[0] as unknown as FilaComentario, reacciones, mias) });
}

async function eliminar(req: VercelRequest, res: VercelResponse): Promise<void> {
  const usuario = await requireUser(req, res);
  if (!usuario) return;

  const id = entero(req.query.id);
  if (!id) {
    fail(res, 'SOLICITUD_INVALIDA', 'Falta el comentario.', 400);
    return;
  }

  const db = getDb();
  const actual = await db.execute({
    sql: 'SELECT user_id FROM comments WHERE id = ?',
    args: [id],
  });
  const duenio = actual.rows[0];
  if (!duenio) {
    fail(res, 'NO_ENCONTRADO', 'Ese comentario no existe.', 404);
    return;
  }
  if (!esPropietario(Number(duenio.user_id), usuario, res)) return;

  await db.batch(
    [
      { sql: 'DELETE FROM comment_reactions WHERE comment_id = ?', args: [id] },
      { sql: 'DELETE FROM comments WHERE id = ?', args: [id] },
    ],
    'write',
  );

  ok(res, { ok: true });
}

async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'GET') return listar(req, res);

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
