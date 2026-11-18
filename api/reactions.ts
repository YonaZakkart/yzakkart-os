import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser } from '../lib/auth';
import { getDb } from '../lib/db';
import { conManejoDeErrores, entero, fail, leerCuerpo, ok, texto } from '../lib/http';
import { esReaccionValida } from '../lib/validate';

type Objetivo = 'post' | 'comment';

interface Tablas {
  tabla: string;
  columna: string;
  idDe: (id: number) => { sql: string; args: number[] };
}

function tablas(objetivo: Objetivo): Tablas {
  if (objetivo === 'post') {
    return {
      tabla: 'post_reactions',
      columna: 'post_id',
      idDe: (id) => ({ sql: 'SELECT id FROM posts WHERE id = ?', args: [id] }),
    };
  }
  return {
    tabla: 'comment_reactions',
    columna: 'comment_id',
    idDe: (id) => ({ sql: 'SELECT id FROM comments WHERE id = ?', args: [id] }),
  };
}

async function contar(objetivo: Objetivo, id: number): Promise<Record<string, number>> {
  const { tabla, columna } = tablas(objetivo);
  const resultado = await getDb().execute({
    sql: `SELECT kind, COUNT(*) AS total FROM ${tabla} WHERE ${columna} = ? GROUP BY kind`,
    args: [id],
  });

  const conteos: Record<string, number> = {};
  for (const fila of resultado.rows) {
    conteos[String(fila.kind)] = Number(fila.total);
  }
  return conteos;
}

async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    fail(res, 'METODO_NO_PERMITIDO', 'Método no permitido.', 405);
    return;
  }

  const usuario = await requireUser(req, res);
  if (!usuario) return;

  const accion = texto(req.query.action) || 'set';
  const cuerpo = leerCuerpo(req);
  const objetivo = texto(cuerpo.target) === 'comment' ? 'comment' : 'post';
  const id = entero(cuerpo.id);

  if (!id) {
    fail(res, 'SOLICITUD_INVALIDA', 'Falta el elemento a reaccionar.', 400);
    return;
  }

  const db = getDb();
  const { tabla, columna, idDe } = tablas(objetivo);

  const existe = await db.execute(idDe(id));
  if (existe.rows.length === 0) {
    fail(res, 'NO_ENCONTRADO', 'Ese elemento no existe.', 404);
    return;
  }

  if (accion === 'remove') {
    await db.execute({
      sql: `DELETE FROM ${tabla} WHERE ${columna} = ? AND user_id = ?`,
      args: [id, usuario.id],
    });
    ok(res, { counts: await contar(objetivo, id) });
    return;
  }

  const kind = texto(cuerpo.kind);
  if (!esReaccionValida(kind)) {
    fail(res, 'VALIDACION', 'Esa reacción no existe.', 400);
    return;
  }

  await db.execute({
    sql: `INSERT INTO ${tabla} (${columna}, user_id, kind) VALUES (?, ?, ?)
          ON CONFLICT (${columna}, user_id) DO UPDATE SET kind = excluded.kind`,
    args: [id, usuario.id, kind],
  });

  ok(res, { reaction: kind, counts: await contar(objetivo, id) });
}

export default conManejoDeErrores(handler);
