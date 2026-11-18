import { createRequire as __crearRequire } from 'node:module';
const require = __crearRequire(import.meta.url);

// lib/auth.ts
import bcrypt from "bcryptjs";

// lib/db.ts
import { createClient } from "@libsql/client";
var cliente = null;
function getDb() {
  if (cliente) return cliente;
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) {
    throw new Error("Falta TURSO_DATABASE_URL en el entorno.");
  }
  cliente = createClient({ url, authToken });
  return cliente;
}

// lib/http.ts
function ok(res, data, status = 200) {
  res.status(status).json({ ok: true, data });
}
function fail(res, code, message, status = 400) {
  res.status(status).json({ ok: false, error: { code, message } });
}
function leerCuerpo(req) {
  const raw = req.body;
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === "object" && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}
function texto(valor) {
  return typeof valor === "string" ? valor : "";
}
function entero(valor) {
  const n = typeof valor === "number" ? valor : Number.parseInt(String(valor ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}
function conManejoDeErrores(handler2) {
  return async (req, res) => {
    try {
      await handler2(req, res);
    } catch (error) {
      console.error("[api] error inesperado:", error instanceof Error ? error.message : error);
      if (!res.headersSent) {
        fail(res, "ERROR_INTERNO", "Algo fall\xF3 en el servidor. Intenta de nuevo.", 500);
      }
    }
  };
}

// lib/auth.ts
function tokenDe(req) {
  const cabecera = req.headers.authorization;
  if (!cabecera) return null;
  const m = /^Bearer\s+(.+)$/i.exec(cabecera);
  return m ? m[1].trim() : null;
}
async function usuarioDeSesion(req) {
  const token = tokenDe(req);
  if (!token) return null;
  const resultado = await getDb().execute({
    sql: `SELECT u.id, u.username, u.is_guest, u.badge_gold, u.badge_yz, u.is_admin
          FROM sessions s JOIN users u ON u.id = s.user_id
          WHERE s.token = ?`,
    args: [token]
  });
  const fila = resultado.rows[0];
  if (!fila) return null;
  return {
    id: Number(fila.id),
    username: String(fila.username),
    is_guest: Number(fila.is_guest) === 1 ? 1 : 0,
    badge_gold: Number(fila.badge_gold) === 1 ? 1 : 0,
    badge_yz: Number(fila.badge_yz) === 1 ? 1 : 0,
    is_admin: Number(fila.is_admin) === 1 ? 1 : 0
  };
}
async function requireUser(req, res) {
  const usuario = await usuarioDeSesion(req);
  if (!usuario) {
    fail(res, "NO_AUTORIZADO", "Tu sesi\xF3n expir\xF3. Vuelve a entrar.", 401);
    return null;
  }
  return usuario;
}
function esPropietario(duenioId, usuario, res) {
  if (usuario.is_admin === 1) return true;
  if (duenioId !== usuario.id) {
    fail(res, "PROHIBIDO", "Solo puedes modificar lo que t\xFA publicaste.", 403);
    return false;
  }
  return true;
}

// lib/validate.ts
var LIMITES = {
  usuarioMin: 3,
  usuarioMax: 20,
  passwordMin: 6,
  passwordMax: 72,
  tituloMin: 3,
  tituloMax: 120,
  cuerpoMax: 5e3,
  comentarioMax: 1e3,
  imagenBytes: 200 * 1024,
  loteMax: 30,
  lotePorDefecto: 10
};
function validarComentario(valor) {
  const v = valor.trim();
  if (v.length === 0) return "El comentario no puede estar vac\xEDo.";
  if (v.length > LIMITES.comentarioMax) {
    return `El comentario no puede superar ${LIMITES.comentarioMax} caracteres.`;
  }
  return null;
}

// server/comments.ts
var CAMPOS = "c.id, c.post_id, c.user_id, c.body, c.created_at, c.updated_at, u.username";
function marcadores(cantidad) {
  return Array.from({ length: cantidad }, () => "?").join(",");
}
async function conteos(ids) {
  const mapa = /* @__PURE__ */ new Map();
  if (ids.length === 0) return mapa;
  const resultado = await getDb().execute({
    sql: `SELECT comment_id, kind, COUNT(*) AS total FROM comment_reactions
          WHERE comment_id IN (${marcadores(ids.length)}) GROUP BY comment_id, kind`,
    args: ids
  });
  for (const fila of resultado.rows) {
    const id = Number(fila.comment_id);
    const actual = mapa.get(id) ?? {};
    actual[String(fila.kind)] = Number(fila.total);
    mapa.set(id, actual);
  }
  return mapa;
}
async function miasDe(userId, ids) {
  const mapa = /* @__PURE__ */ new Map();
  if (!userId || ids.length === 0) return mapa;
  const resultado = await getDb().execute({
    sql: `SELECT comment_id, kind FROM comment_reactions
          WHERE user_id = ? AND comment_id IN (${marcadores(ids.length)})`,
    args: [userId, ...ids]
  });
  for (const fila of resultado.rows) {
    mapa.set(Number(fila.comment_id), String(fila.kind));
  }
  return mapa;
}
function armar(fila, reacciones, mias) {
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
    badge_yz: Number(fila.badge_yz) === 1
  };
}
async function listar(req, res) {
  const postId = entero(req.query.postId);
  if (!postId) {
    fail(res, "SOLICITUD_INVALIDA", "Falta la publicaci\xF3n.", 400);
    return;
  }
  const resultado = await getDb().execute({
    sql: `SELECT ${CAMPOS} FROM comments c JOIN users u ON u.id = c.user_id
          WHERE c.post_id = ? ORDER BY c.created_at ASC, c.id ASC`,
    args: [postId]
  });
  const filas = resultado.rows;
  const ids = filas.map((f) => Number(f.id));
  const usuario = await usuarioDeSesion(req);
  const [reacciones, mias] = await Promise.all([conteos(ids), miasDe(usuario?.id, ids)]);
  ok(res, { comments: filas.map((f) => armar(f, reacciones, mias)) });
}
async function crear(req, res) {
  const usuario = await requireUser(req, res);
  if (!usuario) return;
  const cuerpo = leerCuerpo(req);
  const postId = entero(cuerpo.postId);
  const body = texto(cuerpo.body).trim();
  if (!postId) {
    fail(res, "SOLICITUD_INVALIDA", "Falta la publicaci\xF3n.", 400);
    return;
  }
  const error = validarComentario(body);
  if (error) {
    fail(res, "VALIDACION", error, 400);
    return;
  }
  const db = getDb();
  const existe = await db.execute({ sql: "SELECT id FROM posts WHERE id = ?", args: [postId] });
  if (existe.rows.length === 0) {
    fail(res, "NO_ENCONTRADO", "Esa publicaci\xF3n no existe.", 404);
    return;
  }
  const insert = await db.execute({
    sql: "INSERT INTO comments (post_id, user_id, body) VALUES (?, ?, ?)",
    args: [postId, usuario.id, body]
  });
  const id = Number(insert.lastInsertRowid);
  const resultado = await db.execute({
    sql: `SELECT ${CAMPOS} FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?`,
    args: [id]
  });
  ok(
    res,
    { comment: armar(resultado.rows[0], /* @__PURE__ */ new Map(), /* @__PURE__ */ new Map()) },
    201
  );
}
async function editar(req, res) {
  const usuario = await requireUser(req, res);
  if (!usuario) return;
  const id = entero(req.query.id);
  if (!id) {
    fail(res, "SOLICITUD_INVALIDA", "Falta el comentario.", 400);
    return;
  }
  const db = getDb();
  const actual = await db.execute({
    sql: "SELECT user_id FROM comments WHERE id = ?",
    args: [id]
  });
  const duenio = actual.rows[0];
  if (!duenio) {
    fail(res, "NO_ENCONTRADO", "Ese comentario no existe.", 404);
    return;
  }
  if (!esPropietario(Number(duenio.user_id), usuario, res)) return;
  const body = texto(leerCuerpo(req).body).trim();
  const error = validarComentario(body);
  if (error) {
    fail(res, "VALIDACION", error, 400);
    return;
  }
  await db.execute({
    sql: "UPDATE comments SET body = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    args: [body, id]
  });
  const resultado = await db.execute({
    sql: `SELECT ${CAMPOS} FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?`,
    args: [id]
  });
  const [reacciones, mias] = await Promise.all([conteos([id]), miasDe(usuario.id, [id])]);
  ok(res, { comment: armar(resultado.rows[0], reacciones, mias) });
}
async function eliminar(req, res) {
  const usuario = await requireUser(req, res);
  if (!usuario) return;
  const id = entero(req.query.id);
  if (!id) {
    fail(res, "SOLICITUD_INVALIDA", "Falta el comentario.", 400);
    return;
  }
  const db = getDb();
  const actual = await db.execute({
    sql: "SELECT user_id FROM comments WHERE id = ?",
    args: [id]
  });
  const duenio = actual.rows[0];
  if (!duenio) {
    fail(res, "NO_ENCONTRADO", "Ese comentario no existe.", 404);
    return;
  }
  if (!esPropietario(Number(duenio.user_id), usuario, res)) return;
  await db.batch(
    [
      { sql: "DELETE FROM comment_reactions WHERE comment_id = ?", args: [id] },
      { sql: "DELETE FROM comments WHERE id = ?", args: [id] }
    ],
    "write"
  );
  ok(res, { ok: true });
}
async function handler(req, res) {
  if (req.method === "GET") return listar(req, res);
  switch (req.method) {
    case "POST":
      return crear(req, res);
    case "PATCH":
    case "PUT":
      return editar(req, res);
    case "DELETE":
      return eliminar(req, res);
    default:
      fail(res, "METODO_NO_PERMITIDO", "M\xE9todo no permitido.", 405);
  }
}
var comments_default = conManejoDeErrores(handler);
export {
  comments_default as default
};
