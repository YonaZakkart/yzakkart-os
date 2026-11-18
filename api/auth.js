import { createRequire as __crearRequire } from 'node:module';
const require = __crearRequire(import.meta.url);

// server/auth.ts
import { randomInt as randomInt2 } from "node:crypto";

// lib/auth.ts
import { randomBytes, randomInt } from "node:crypto";
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
var RONDAS = 10;
function hashPassword(password) {
  return bcrypt.hash(password, RONDAS);
}
function verificarPassword(password, hash) {
  return bcrypt.compare(password, hash);
}
function generarToken() {
  return randomBytes(32).toString("base64url");
}
function generarCodigo() {
  return String(randomInt(1e5, 1e6));
}
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
async function crearSesion(userId) {
  const token = generarToken();
  await getDb().execute({
    sql: "INSERT INTO sessions (token, user_id) VALUES (?, ?)",
    args: [token, userId]
  });
  return token;
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
var REUSUARIO = /^[A-Za-z0-9_]+$/;
var REEMAIL = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
function validarUsuario(valor) {
  const v = valor.trim();
  if (v.length < LIMITES.usuarioMin || v.length > LIMITES.usuarioMax) {
    return `El usuario debe tener entre ${LIMITES.usuarioMin} y ${LIMITES.usuarioMax} caracteres.`;
  }
  if (!REUSUARIO.test(v)) {
    return "El usuario solo admite letras, n\xFAmeros y guion bajo.";
  }
  return null;
}
function validarPassword(valor) {
  if (valor.length < LIMITES.passwordMin) {
    return `La contrase\xF1a debe tener al menos ${LIMITES.passwordMin} caracteres.`;
  }
  if (valor.length > LIMITES.passwordMax) {
    return `La contrase\xF1a no puede superar ${LIMITES.passwordMax} caracteres.`;
  }
  return null;
}
function validarEmail(valor) {
  if (!REEMAIL.test(valor.trim())) {
    return "Escribe un correo con formato v\xE1lido.";
  }
  return null;
}

// server/auth.ts
var MINUTOS_CODIGO = 10;
var TOKEN_DUENIA = process.env.BADGE_TOKEN ?? "YonaZakkartinYZakkart";
var CUENTA_DUENIA = "yona_zakkart";
async function crearInvitado() {
  const db = getDb();
  for (let intento = 0; intento < 6; intento++) {
    const username = `Invitado_${randomInt2(1e3, 1e4)}`;
    try {
      const insert = await db.execute({
        sql: "INSERT INTO users (username, is_guest) VALUES (?, 1)",
        args: [username]
      });
      const id = Number(insert.lastInsertRowid);
      const token = await crearSesion(id);
      return {
        user: { id, username, is_guest: 1, badge_gold: 0, badge_yz: 0, is_admin: 0 },
        token
      };
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : "";
      if (!mensaje.includes("UNIQUE")) throw error;
    }
  }
  throw new Error("No se pudo generar un nombre de invitado libre.");
}
async function handler(req, res) {
  const accion = texto(req.query.action) || "me";
  if (req.method === "GET") {
    if (accion !== "me") {
      fail(res, "SOLICITUD_INVALIDA", "Acci\xF3n desconocida.", 400);
      return;
    }
    const usuario = await usuarioDeSesion(req);
    if (!usuario) {
      fail(res, "NO_AUTORIZADO", "Tu sesi\xF3n expir\xF3. Vuelve a entrar.", 401);
      return;
    }
    ok(res, { user: usuario });
    return;
  }
  if (req.method !== "POST") {
    fail(res, "METODO_NO_PERMITIDO", "M\xE9todo no permitido.", 405);
    return;
  }
  const cuerpo = leerCuerpo(req);
  const db = getDb();
  switch (accion) {
    case "guest": {
      const sesion = await crearInvitado();
      ok(res, sesion, 201);
      return;
    }
    case "register": {
      const usuario = await requireUser(req, res);
      if (!usuario) return;
      if (usuario.is_guest === 0) {
        fail(res, "YA_REGISTRADO", "Esta sesi\xF3n ya pertenece a una cuenta.", 409);
        return;
      }
      const username = texto(cuerpo.username).trim();
      const password = texto(cuerpo.password);
      const email = texto(cuerpo.email).trim();
      const error = validarUsuario(username) ?? validarPassword(password) ?? validarEmail(email);
      if (error) {
        fail(res, "VALIDACION", error, 400);
        return;
      }
      const ocupado = await db.execute({
        sql: "SELECT id FROM users WHERE username = ? AND id <> ?",
        args: [username, usuario.id]
      });
      if (ocupado.rows.length > 0) {
        fail(res, "YA_EXISTE", "Ese nombre de usuario ya est\xE1 ocupado.", 409);
        return;
      }
      const hash = await hashPassword(password);
      const code = generarCodigo();
      const expiresAt = new Date(Date.now() + MINUTOS_CODIGO * 6e4).toISOString();
      await db.execute({
        sql: `INSERT INTO pending_verifications (user_id, new_username, password_hash, code, expires_at)
              VALUES (?, ?, ?, ?, ?)
              ON CONFLICT(user_id) DO UPDATE SET
                new_username = excluded.new_username,
                password_hash = excluded.password_hash,
                code = excluded.code,
                expires_at = excluded.expires_at`,
        args: [usuario.id, username, hash, code, expiresAt]
      });
      ok(res, { code, expiresAt, email });
      return;
    }
    case "verify": {
      const usuario = await requireUser(req, res);
      if (!usuario) return;
      const code = texto(cuerpo.code).trim();
      const pendiente = await db.execute({
        sql: "SELECT new_username, password_hash, code, expires_at FROM pending_verifications WHERE user_id = ?",
        args: [usuario.id]
      });
      const fila = pendiente.rows[0];
      if (!fila) {
        fail(res, "SIN_REGISTRO", "No hay un registro pendiente. Empieza de nuevo.", 400);
        return;
      }
      if (new Date(String(fila.expires_at)).getTime() < Date.now()) {
        fail(res, "CODIGO_EXPIRADO", "El c\xF3digo expir\xF3. Vuelve a registrarte.", 400);
        return;
      }
      if (code !== String(fila.code)) {
        fail(res, "CODIGO_INVALIDO", "El c\xF3digo no coincide. Rev\xEDsalo.", 400);
        return;
      }
      const nuevoNombre = String(fila.new_username);
      const esDuenia = nuevoNombre.toLowerCase() === CUENTA_DUENIA;
      await db.batch(
        [
          {
            sql: `UPDATE users
                  SET username = ?, password_hash = ?, is_guest = 0,
                      badge_gold = CASE WHEN ? = 1 THEN 1 ELSE badge_gold END,
                      badge_yz = CASE WHEN ? = 1 THEN 1 ELSE badge_yz END,
                      is_admin = CASE WHEN ? = 1 THEN 1 ELSE is_admin END
                  WHERE id = ?`,
            args: [
              nuevoNombre,
              String(fila.password_hash),
              esDuenia ? 1 : 0,
              esDuenia ? 1 : 0,
              esDuenia ? 1 : 0,
              usuario.id
            ]
          },
          {
            sql: "DELETE FROM pending_verifications WHERE user_id = ?",
            args: [usuario.id]
          },
          {
            sql: "DELETE FROM sessions WHERE user_id = ?",
            args: [usuario.id]
          }
        ],
        "write"
      );
      const token = await crearSesion(usuario.id);
      const actualizado = {
        id: usuario.id,
        username: nuevoNombre,
        is_guest: 0,
        badge_gold: esDuenia ? 1 : usuario.badge_gold,
        badge_yz: esDuenia ? 1 : usuario.badge_yz,
        is_admin: esDuenia ? 1 : usuario.is_admin
      };
      ok(res, { user: actualizado, token });
      return;
    }
    case "login": {
      const username = texto(cuerpo.username).trim();
      const password = texto(cuerpo.password);
      if (!username || !password) {
        fail(res, "VALIDACION", "Escribe tu usuario y contrase\xF1a.", 400);
        return;
      }
      const resultado = await db.execute({
        sql: `SELECT id, username, is_guest, password_hash, badge_gold, badge_yz, is_admin
              FROM users WHERE username = ? COLLATE NOCASE AND is_guest = 0`,
        args: [username]
      });
      const fila = resultado.rows[0];
      const hash = fila?.password_hash ? String(fila.password_hash) : null;
      const coincide = hash ? await verificarPassword(password, hash) : false;
      if (!fila || !coincide) {
        fail(res, "NO_AUTORIZADO", "Usuario o contrase\xF1a incorrectos.", 401);
        return;
      }
      const id = Number(fila.id);
      const token = await crearSesion(id);
      ok(res, {
        user: {
          id,
          username: String(fila.username),
          is_guest: 0,
          badge_gold: Number(fila.badge_gold) === 1 ? 1 : 0,
          badge_yz: Number(fila.badge_yz) === 1 ? 1 : 0,
          is_admin: Number(fila.is_admin) === 1 ? 1 : 0
        },
        token
      });
      return;
    }
    case "reenviar": {
      const usuario = await requireUser(req, res);
      if (!usuario) return;
      const pendiente = await db.execute({
        sql: "SELECT user_id FROM pending_verifications WHERE user_id = ?",
        args: [usuario.id]
      });
      if (pendiente.rows.length === 0) {
        fail(res, "SIN_REGISTRO", "No hay un registro pendiente.", 400);
        return;
      }
      const code = generarCodigo();
      const expiresAt = new Date(Date.now() + MINUTOS_CODIGO * 6e4).toISOString();
      await db.execute({
        sql: "UPDATE pending_verifications SET code = ?, expires_at = ? WHERE user_id = ?",
        args: [code, expiresAt, usuario.id]
      });
      ok(res, { code, expiresAt });
      return;
    }
    case "insignia": {
      const usuario = await requireUser(req, res);
      if (!usuario) return;
      const metodo = texto(cuerpo.metodo);
      if (metodo === "token") {
        if (texto(cuerpo.token).trim() !== TOKEN_DUENIA) {
          fail(res, "TOKEN_INVALIDO", "Ese token no es v\xE1lido.", 400);
          return;
        }
        await db.execute({
          sql: "UPDATE users SET badge_gold = 1, badge_yz = 1, is_admin = 1 WHERE id = ?",
          args: [usuario.id]
        });
        ok(res, {
          user: {
            ...usuario,
            badge_gold: 1,
            badge_yz: 1,
            is_admin: 1
          }
        });
        return;
      }
      if (metodo === "estrella") {
        await db.execute({
          sql: "UPDATE users SET badge_gold = 1 WHERE id = ?",
          args: [usuario.id]
        });
        ok(res, { user: { ...usuario, badge_gold: 1 } });
        return;
      }
      fail(res, "SOLICITUD_INVALIDA", "M\xE9todo de verificaci\xF3n desconocido.", 400);
      return;
    }
    case "logout": {
      const token = tokenDe(req);
      if (token) {
        await db.execute({ sql: "DELETE FROM sessions WHERE token = ?", args: [token] });
      }
      ok(res, { ok: true });
      return;
    }
    default:
      fail(res, "SOLICITUD_INVALIDA", "Acci\xF3n desconocida.", 400);
  }
}
var auth_default = conManejoDeErrores(handler);
export {
  auth_default as default
};
