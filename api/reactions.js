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
    sql: `SELECT u.id, u.username, u.is_guest, u.badge_gold, u.badge_yz
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
    badge_yz: Number(fila.badge_yz) === 1 ? 1 : 0
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

// src/models/types.ts
var REACCIONES = [
  { kind: "me_gusta", emoji: "\u{1F44D}", etiqueta: "Me gusta" },
  { kind: "me_encanta", emoji: "\u2764\uFE0F", etiqueta: "Me encanta" },
  { kind: "risa", emoji: "\u{1F602}", etiqueta: "Me da risa" },
  { kind: "sorpresa", emoji: "\u{1F62E}", etiqueta: "Me sorprende" },
  { kind: "enojo", emoji: "\u{1F620}", etiqueta: "Me molesta" }
];

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
function esReaccionValida(kind) {
  return REACCIONES.some((r) => r.kind === kind);
}

// server/reactions.ts
function tablas(objetivo) {
  if (objetivo === "post") {
    return {
      tabla: "post_reactions",
      columna: "post_id",
      idDe: (id) => ({ sql: "SELECT id FROM posts WHERE id = ?", args: [id] })
    };
  }
  return {
    tabla: "comment_reactions",
    columna: "comment_id",
    idDe: (id) => ({ sql: "SELECT id FROM comments WHERE id = ?", args: [id] })
  };
}
async function contar(objetivo, id) {
  const { tabla, columna } = tablas(objetivo);
  const resultado = await getDb().execute({
    sql: `SELECT kind, COUNT(*) AS total FROM ${tabla} WHERE ${columna} = ? GROUP BY kind`,
    args: [id]
  });
  const conteos = {};
  for (const fila of resultado.rows) {
    conteos[String(fila.kind)] = Number(fila.total);
  }
  return conteos;
}
async function handler(req, res) {
  if (req.method !== "POST") {
    fail(res, "METODO_NO_PERMITIDO", "M\xE9todo no permitido.", 405);
    return;
  }
  const usuario = await requireUser(req, res);
  if (!usuario) return;
  const accion = texto(req.query.action) || "set";
  const cuerpo = leerCuerpo(req);
  const objetivo = texto(cuerpo.target) === "comment" ? "comment" : "post";
  const id = entero(cuerpo.id);
  if (!id) {
    fail(res, "SOLICITUD_INVALIDA", "Falta el elemento a reaccionar.", 400);
    return;
  }
  const db = getDb();
  const { tabla, columna, idDe } = tablas(objetivo);
  const existe = await db.execute(idDe(id));
  if (existe.rows.length === 0) {
    fail(res, "NO_ENCONTRADO", "Ese elemento no existe.", 404);
    return;
  }
  if (accion === "remove") {
    await db.execute({
      sql: `DELETE FROM ${tabla} WHERE ${columna} = ? AND user_id = ?`,
      args: [id, usuario.id]
    });
    ok(res, { counts: await contar(objetivo, id) });
    return;
  }
  const kind = texto(cuerpo.kind);
  if (!esReaccionValida(kind)) {
    fail(res, "VALIDACION", "Esa reacci\xF3n no existe.", 400);
    return;
  }
  await db.execute({
    sql: `INSERT INTO ${tabla} (${columna}, user_id, kind) VALUES (?, ?, ?)
          ON CONFLICT (${columna}, user_id) DO UPDATE SET kind = excluded.kind`,
    args: [id, usuario.id, kind]
  });
  ok(res, { reaction: kind, counts: await contar(objetivo, id) });
}
var reactions_default = conManejoDeErrores(handler);
export {
  reactions_default as default
};
