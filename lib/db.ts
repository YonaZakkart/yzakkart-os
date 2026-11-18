import { type Client, createClient } from '@libsql/client';

let cliente: Client | null = null;

/**
 * Cliente libSQL perezoso: se crea una vez por proceso y solo cuando se usa.
 * Así una función sin variables de entorno responde un error claro en lugar
 * de romper al importarse.
 */
export function getDb(): Client {
  if (cliente) return cliente;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error('Falta TURSO_DATABASE_URL en el entorno.');
  }

  cliente = createClient({ url, authToken });
  return cliente;
}
