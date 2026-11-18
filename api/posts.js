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
var REIMAGEN = /^data:image\/(webp|jpeg|png);base64,([A-Za-z0-9+/=]+)$/;
function validarTitulo(valor) {
  const v = valor.trim();
  if (v.length < LIMITES.tituloMin) {
    return `El t\xEDtulo necesita al menos ${LIMITES.tituloMin} caracteres.`;
  }
  if (v.length > LIMITES.tituloMax) {
    return `El t\xEDtulo no puede superar ${LIMITES.tituloMax} caracteres.`;
  }
  return null;
}
function validarCuerpo(valor) {
  const v = valor.trim();
  if (v.length === 0) return "El texto de la publicaci\xF3n no puede estar vac\xEDo.";
  if (v.length > LIMITES.cuerpoMax) {
    return `El texto no puede superar ${LIMITES.cuerpoMax} caracteres.`;
  }
  return null;
}
function validarImagen(valor) {
  const m = REIMAGEN.exec(valor);
  if (!m) return "La imagen debe ser WebP, JPEG o PNG.";
  const base64 = m[2];
  const bytes = Math.floor(base64.length * 3 / 4) - (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);
  if (bytes > LIMITES.imagenBytes) {
    return `La imagen supera el l\xEDmite de ${Math.round(LIMITES.imagenBytes / 1024)} KB.`;
  }
  return { mime: `image/${m[1]}`, bytes, base64 };
}
function parsearListaIds(valor) {
  if (typeof valor !== "string" || valor.trim() === "") return [];
  const ids = valor.split(",").map((x) => Number.parseInt(x.trim(), 10)).filter((n) => Number.isFinite(n) && n > 0);
  return [...new Set(ids)].slice(0, 200);
}

// server/posts.ts
var CAMPOS_POST = `p.id, p.user_id, p.title, p.body, (p.image IS NOT NULL) AS hasImage,
       p.created_at, p.updated_at, u.username, u.badge_gold, u.badge_yz`;
function marcadores(cantidad) {
  return Array.from({ length: cantidad }, () => "?").join(",");
}
async function conteosDeReacciones(ids) {
  const mapa = /* @__PURE__ */ new Map();
  if (ids.length === 0) return mapa;
  const resultado = await getDb().execute({
    sql: `SELECT post_id, kind, COUNT(*) AS total
          FROM post_reactions WHERE post_id IN (${marcadores(ids.length)})
          GROUP BY post_id, kind`,
    args: ids
  });
  for (const fila of resultado.rows) {
    const id = Number(fila.post_id);
    const actual = mapa.get(id) ?? {};
    actual[String(fila.kind)] = Number(fila.total);
    mapa.set(id, actual);
  }
  return mapa;
}
async function conteosDeComentarios(ids) {
  const mapa = /* @__PURE__ */ new Map();
  if (ids.length === 0) return mapa;
  const resultado = await getDb().execute({
    sql: `SELECT post_id, COUNT(*) AS total FROM comments
          WHERE post_id IN (${marcadores(ids.length)}) GROUP BY post_id`,
    args: ids
  });
  for (const fila of resultado.rows) {
    mapa.set(Number(fila.post_id), Number(fila.total));
  }
  return mapa;
}
async function reaccionesPropias(userId, ids) {
  const mapa = /* @__PURE__ */ new Map();
  if (!userId || ids.length === 0) return mapa;
  const resultado = await getDb().execute({
    sql: `SELECT post_id, kind FROM post_reactions
          WHERE user_id = ? AND post_id IN (${marcadores(ids.length)})`,
    args: [userId, ...ids]
  });
  for (const fila of resultado.rows) {
    mapa.set(Number(fila.post_id), String(fila.kind));
  }
  return mapa;
}
function armarPublicacion(fila, reacciones, comentarios, mias) {
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
    miReaccion: mias.get(id) ?? null,
    comentarios: comentarios.get(id) ?? 0,
    badge_gold: Number(fila.badge_gold) === 1,
    badge_yz: Number(fila.badge_yz) === 1
  };
}
async function listar(req, res) {
  const limitePedido = entero(req.query.limit) ?? LIMITES.lotePorDefecto;
  const limite = Math.min(Math.max(limitePedido, 1), LIMITES.loteMax);
  const excluir = parsearListaIds(req.query.exclude);
  const orden = texto(req.query.order);
  const db = getDb();
  const criterio = orden === "antiguos" ? "p.created_at ASC, p.id ASC" : orden === "comentados" ? "(SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) DESC, p.created_at DESC" : "p.created_at DESC, p.id DESC";
  const filtro = excluir.length > 0 ? `WHERE p.id NOT IN (${marcadores(excluir.length)})` : "";
  const resultado = await db.execute({
    sql: `SELECT ${CAMPOS_POST}
          FROM posts p JOIN users u ON u.id = p.user_id
          ${filtro}
          ORDER BY ${criterio} LIMIT ?`,
    args: [...excluir, limite]
  });
  const filas = resultado.rows;
  const ids = filas.map((f) => Number(f.id));
  const usuario = await usuarioDeSesion(req);
  const [reacciones, comentarios, mias] = await Promise.all([
    conteosDeReacciones(ids),
    conteosDeComentarios(ids),
    reaccionesPropias(usuario?.id, ids)
  ]);
  const posts = filas.map((f) => armarPublicacion(f, reacciones, comentarios, mias));
  ok(res, { posts });
}
async function detalle(req, res) {
  const id = entero(req.query.id);
  if (!id) {
    fail(res, "SOLICITUD_INVALIDA", "Falta el identificador de la publicaci\xF3n.", 400);
    return;
  }
  const resultado = await getDb().execute({
    sql: `SELECT ${CAMPOS_POST} FROM posts p JOIN users u ON u.id = p.user_id WHERE p.id = ?`,
    args: [id]
  });
  const fila = resultado.rows[0];
  if (!fila) {
    fail(res, "NO_ENCONTRADO", "Esa publicaci\xF3n no existe.", 404);
    return;
  }
  const usuario = await usuarioDeSesion(req);
  const [reacciones, comentarios, mias] = await Promise.all([
    conteosDeReacciones([id]),
    conteosDeComentarios([id]),
    reaccionesPropias(usuario?.id, [id])
  ]);
  ok(res, { post: armarPublicacion(fila, reacciones, comentarios, mias) });
}
async function estadisticas(res) {
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
      users: Number(fila?.users ?? 0)
    }
  });
}
async function crear(req, res) {
  const usuario = await requireUser(req, res);
  if (!usuario) return;
  const cuerpo = leerCuerpo(req);
  const title = texto(cuerpo.title).trim();
  const body = texto(cuerpo.body).trim();
  const imagen = texto(cuerpo.image);
  const error = validarTitulo(title) ?? validarCuerpo(body);
  if (error) {
    fail(res, "VALIDACION", error, 400);
    return;
  }
  let dataUrl = null;
  if (imagen) {
    const valida = validarImagen(imagen);
    if (typeof valida === "string") {
      fail(
        res,
        valida.includes("l\xEDmite") ? "DEMASIADO_GRANDE" : "TIPO_NO_SOPORTADO",
        valida,
        valida.includes("l\xEDmite") ? 413 : 415
      );
      return;
    }
    dataUrl = imagen;
  }
  const insert = await getDb().execute({
    sql: "INSERT INTO posts (user_id, title, body, image) VALUES (?, ?, ?, ?)",
    args: [usuario.id, title, body, dataUrl]
  });
  const id = Number(insert.lastInsertRowid);
  const resultado = await getDb().execute({
    sql: `SELECT ${CAMPOS_POST} FROM posts p JOIN users u ON u.id = p.user_id WHERE p.id = ?`,
    args: [id]
  });
  const fila = resultado.rows[0];
  ok(res, { post: armarPublicacion(fila, /* @__PURE__ */ new Map(), /* @__PURE__ */ new Map(), /* @__PURE__ */ new Map()) }, 201);
}
async function editar(req, res) {
  const usuario = await requireUser(req, res);
  if (!usuario) return;
  const id = entero(req.query.id);
  if (!id) {
    fail(res, "SOLICITUD_INVALIDA", "Falta el identificador de la publicaci\xF3n.", 400);
    return;
  }
  const db = getDb();
  const actual = await db.execute({
    sql: "SELECT user_id FROM posts WHERE id = ?",
    args: [id]
  });
  const duenio = actual.rows[0];
  if (!duenio) {
    fail(res, "NO_ENCONTRADO", "Esa publicaci\xF3n no existe.", 404);
    return;
  }
  if (!esPropietario(Number(duenio.user_id), usuario, res)) return;
  const cuerpo = leerCuerpo(req);
  const asignaciones = [];
  const args = [];
  if (cuerpo.title !== void 0) {
    const title = texto(cuerpo.title).trim();
    const error = validarTitulo(title);
    if (error) {
      fail(res, "VALIDACION", error, 400);
      return;
    }
    asignaciones.push("title = ?");
    args.push(title);
  }
  if (cuerpo.body !== void 0) {
    const body = texto(cuerpo.body).trim();
    const error = validarCuerpo(body);
    if (error) {
      fail(res, "VALIDACION", error, 400);
      return;
    }
    asignaciones.push("body = ?");
    args.push(body);
  }
  if (cuerpo.image !== void 0) {
    const imagen = texto(cuerpo.image);
    if (imagen === "") {
      asignaciones.push("image = NULL");
    } else {
      const valida = validarImagen(imagen);
      if (typeof valida === "string") {
        const pesada = valida.includes("l\xEDmite");
        fail(res, pesada ? "DEMASIADO_GRANDE" : "TIPO_NO_SOPORTADO", valida, pesada ? 413 : 415);
        return;
      }
      asignaciones.push("image = ?");
      args.push(imagen);
    }
  }
  if (asignaciones.length === 0) {
    fail(res, "SOLICITUD_INVALIDA", "No hay cambios que guardar.", 400);
    return;
  }
  asignaciones.push("updated_at = CURRENT_TIMESTAMP");
  await db.execute({
    sql: `UPDATE posts SET ${asignaciones.join(", ")} WHERE id = ?`,
    args: [...args, id]
  });
  const resultado = await db.execute({
    sql: `SELECT ${CAMPOS_POST} FROM posts p JOIN users u ON u.id = p.user_id WHERE p.id = ?`,
    args: [id]
  });
  const fila = resultado.rows[0];
  const [reacciones, comentarios, mias] = await Promise.all([
    conteosDeReacciones([id]),
    conteosDeComentarios([id]),
    reaccionesPropias(usuario.id, [id])
  ]);
  ok(res, { post: armarPublicacion(fila, reacciones, comentarios, mias) });
}
async function eliminar(req, res) {
  const usuario = await requireUser(req, res);
  if (!usuario) return;
  const id = entero(req.query.id);
  if (!id) {
    fail(res, "SOLICITUD_INVALIDA", "Falta el identificador de la publicaci\xF3n.", 400);
    return;
  }
  const db = getDb();
  const actual = await db.execute({
    sql: "SELECT user_id FROM posts WHERE id = ?",
    args: [id]
  });
  const duenio = actual.rows[0];
  if (!duenio) {
    fail(res, "NO_ENCONTRADO", "Esa publicaci\xF3n no existe.", 404);
    return;
  }
  if (!esPropietario(Number(duenio.user_id), usuario, res)) return;
  await db.batch(
    [
      {
        sql: "DELETE FROM comment_reactions WHERE comment_id IN (SELECT id FROM comments WHERE post_id = ?)",
        args: [id]
      },
      { sql: "DELETE FROM comments WHERE post_id = ?", args: [id] },
      { sql: "DELETE FROM post_reactions WHERE post_id = ?", args: [id] },
      { sql: "DELETE FROM posts WHERE id = ?", args: [id] }
    ],
    "write"
  );
  ok(res, { ok: true });
}
async function handler(req, res) {
  const accion = texto(req.query.action);
  if (req.method === "GET") {
    switch (accion) {
      case "detail":
        return detalle(req, res);
      case "stats":
        return estadisticas(res);
      default:
        return listar(req, res);
    }
  }
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
var posts_default = conManejoDeErrores(handler);
export {
  posts_default as default
};
