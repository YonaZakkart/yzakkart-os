import { randomInt } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  crearSesion,
  generarCodigo,
  hashPassword,
  requireUser,
  tokenDe,
  usuarioDeSesion,
  verificarPassword,
} from '../lib/auth';
import { getDb } from '../lib/db';
import { conManejoDeErrores, fail, leerCuerpo, ok, texto } from '../lib/http';
import { validarEmail, validarPassword, validarUsuario } from '../lib/validate';
import type { SesionIniciada, Usuario } from '../src/models/types';

const MINUTOS_CODIGO = 10;

async function crearInvitado(): Promise<SesionIniciada> {
  const db = getDb();

  for (let intento = 0; intento < 6; intento++) {
    const username = `Invitado_${randomInt(1000, 10000)}`;
    try {
      const insert = await db.execute({
        sql: 'INSERT INTO users (username, is_guest) VALUES (?, 1)',
        args: [username],
      });
      const id = Number(insert.lastInsertRowid);
      const token = await crearSesion(id);
      return { user: { id, username, is_guest: 1 }, token };
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : '';
      if (!mensaje.includes('UNIQUE')) throw error;
    }
  }

  throw new Error('No se pudo generar un nombre de invitado libre.');
}

async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const accion = texto(req.query.action) || 'me';

  if (req.method === 'GET') {
    if (accion !== 'me') {
      fail(res, 'SOLICITUD_INVALIDA', 'Acción desconocida.', 400);
      return;
    }
    const usuario = await usuarioDeSesion(req);
    if (!usuario) {
      fail(res, 'NO_AUTORIZADO', 'Tu sesión expiró. Vuelve a entrar.', 401);
      return;
    }
    ok(res, { user: usuario });
    return;
  }

  if (req.method !== 'POST') {
    fail(res, 'METODO_NO_PERMITIDO', 'Método no permitido.', 405);
    return;
  }

  const cuerpo = leerCuerpo(req);
  const db = getDb();

  switch (accion) {
    case 'guest': {
      const sesion = await crearInvitado();
      ok(res, sesion, 201);
      return;
    }

    case 'register': {
      const usuario = await requireUser(req, res);
      if (!usuario) return;

      if (usuario.is_guest === 0) {
        fail(res, 'YA_REGISTRADO', 'Esta sesión ya pertenece a una cuenta.', 409);
        return;
      }

      const username = texto(cuerpo.username).trim();
      const password = texto(cuerpo.password);
      const email = texto(cuerpo.email).trim();

      const error = validarUsuario(username) ?? validarPassword(password) ?? validarEmail(email);
      if (error) {
        fail(res, 'VALIDACION', error, 400);
        return;
      }

      const ocupado = await db.execute({
        sql: 'SELECT id FROM users WHERE username = ? AND id <> ?',
        args: [username, usuario.id],
      });
      if (ocupado.rows.length > 0) {
        fail(res, 'YA_EXISTE', 'Ese nombre de usuario ya está ocupado.', 409);
        return;
      }

      const hash = await hashPassword(password);
      const code = generarCodigo();
      const expiresAt = new Date(Date.now() + MINUTOS_CODIGO * 60_000).toISOString();

      await db.execute({
        sql: `INSERT INTO pending_verifications (user_id, new_username, password_hash, code, expires_at)
              VALUES (?, ?, ?, ?, ?)
              ON CONFLICT(user_id) DO UPDATE SET
                new_username = excluded.new_username,
                password_hash = excluded.password_hash,
                code = excluded.code,
                expires_at = excluded.expires_at`,
        args: [usuario.id, username, hash, code, expiresAt],
      });

      ok(res, { code, expiresAt, email });
      return;
    }

    case 'verify': {
      const usuario = await requireUser(req, res);
      if (!usuario) return;

      const code = texto(cuerpo.code).trim();
      const pendiente = await db.execute({
        sql: 'SELECT new_username, password_hash, code, expires_at FROM pending_verifications WHERE user_id = ?',
        args: [usuario.id],
      });
      const fila = pendiente.rows[0];

      if (!fila) {
        fail(res, 'SIN_REGISTRO', 'No hay un registro pendiente. Empieza de nuevo.', 400);
        return;
      }

      if (new Date(String(fila.expires_at)).getTime() < Date.now()) {
        fail(res, 'CODIGO_EXPIRADO', 'El código expiró. Vuelve a registrarte.', 400);
        return;
      }

      if (code !== String(fila.code)) {
        fail(res, 'CODIGO_INVALIDO', 'El código no coincide. Revísalo.', 400);
        return;
      }

      const nuevoNombre = String(fila.new_username);

      await db.batch(
        [
          {
            sql: 'UPDATE users SET username = ?, password_hash = ?, is_guest = 0 WHERE id = ?',
            args: [nuevoNombre, String(fila.password_hash), usuario.id],
          },
          {
            sql: 'DELETE FROM pending_verifications WHERE user_id = ?',
            args: [usuario.id],
          },
          {
            sql: 'DELETE FROM sessions WHERE user_id = ?',
            args: [usuario.id],
          },
        ],
        'write',
      );

      const token = await crearSesion(usuario.id);
      const actualizado: Usuario = { id: usuario.id, username: nuevoNombre, is_guest: 0 };
      ok(res, { user: actualizado, token });
      return;
    }

    case 'login': {
      const username = texto(cuerpo.username).trim();
      const password = texto(cuerpo.password);

      if (!username || !password) {
        fail(res, 'VALIDACION', 'Escribe tu usuario y contraseña.', 400);
        return;
      }

      const resultado = await db.execute({
        sql: `SELECT id, username, is_guest, password_hash
              FROM users WHERE username = ? COLLATE NOCASE AND is_guest = 0`,
        args: [username],
      });
      const fila = resultado.rows[0];
      const hash = fila?.password_hash ? String(fila.password_hash) : null;

      const coincide = hash ? await verificarPassword(password, hash) : false;
      if (!fila || !coincide) {
        fail(res, 'NO_AUTORIZADO', 'Usuario o contraseña incorrectos.', 401);
        return;
      }

      const id = Number(fila.id);
      const token = await crearSesion(id);
      ok(res, {
        user: { id, username: String(fila.username), is_guest: 0 as const },
        token,
      });
      return;
    }

    case 'logout': {
      const token = tokenDe(req);
      if (token) {
        await db.execute({ sql: 'DELETE FROM sessions WHERE token = ?', args: [token] });
      }
      ok(res, { ok: true });
      return;
    }

    default:
      fail(res, 'SOLICITUD_INVALIDA', 'Acción desconocida.', 400);
  }
}

export default conManejoDeErrores(handler);
