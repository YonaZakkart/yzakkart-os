import { randomBytes, randomInt } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import type { Usuario } from '../src/models/types';
import { getDb } from './db';
import { fail } from './http';

const RONDAS = 10;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, RONDAS);
}

export function verificarPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generarToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Código de 6 dígitos, generado en el servidor. */
export function generarCodigo(): string {
  return String(randomInt(100_000, 1_000_000));
}

export function tokenDe(req: VercelRequest): string | null {
  const cabecera = req.headers.authorization;
  if (!cabecera) return null;
  const m = /^Bearer\s+(.+)$/i.exec(cabecera);
  return m ? m[1].trim() : null;
}

export async function usuarioDeSesion(req: VercelRequest): Promise<Usuario | null> {
  const token = tokenDe(req);
  if (!token) return null;

  const resultado = await getDb().execute({
    sql: `SELECT u.id, u.username, u.is_guest
          FROM sessions s JOIN users u ON u.id = s.user_id
          WHERE s.token = ?`,
    args: [token],
  });

  const fila = resultado.rows[0];
  if (!fila) return null;

  return {
    id: Number(fila.id),
    username: String(fila.username),
    is_guest: Number(fila.is_guest) === 1 ? 1 : 0,
  };
}

/** Devuelve el usuario de la sesión o responde 401. */
export async function requireUser(
  req: VercelRequest,
  res: VercelResponse,
): Promise<Usuario | null> {
  const usuario = await usuarioDeSesion(req);
  if (!usuario) {
    fail(res, 'NO_AUTORIZADO', 'Tu sesión expiró. Vuelve a entrar.', 401);
    return null;
  }
  return usuario;
}

export async function crearSesion(userId: number): Promise<string> {
  const token = generarToken();
  await getDb().execute({
    sql: 'INSERT INTO sessions (token, user_id) VALUES (?, ?)',
    args: [token, userId],
  });
  return token;
}

/** Comprueba propiedad; responde 403 si no coincide. */
export function esPropietario(duenioId: number, usuario: Usuario, res: VercelResponse): boolean {
  if (duenioId !== usuario.id) {
    fail(res, 'PROHIBIDO', 'Solo puedes modificar lo que tú publicaste.', 403);
    return false;
  }
  return true;
}
