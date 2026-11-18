import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Envoltura uniforme de la API: { ok: true, data } | { ok: false, error }.
 * El cliente solo usa `message` para mostrar; `code` es para tests y diagnóstico.
 */

export function ok<T>(res: VercelResponse, data: T, status = 200): void {
  res.status(status).json({ ok: true, data });
}

export function fail(res: VercelResponse, code: string, message: string, status = 400): void {
  res.status(status).json({ ok: false, error: { code, message } });
}

/** Lee el cuerpo JSON venga como objeto o como texto. */
export function leerCuerpo(req: VercelRequest): Record<string, unknown> {
  const raw = req.body;
  if (!raw) return {};
  if (typeof raw === 'object') return raw as Record<string, unknown>;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

export function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : '';
}

export function entero(valor: unknown): number | null {
  const n = typeof valor === 'number' ? valor : Number.parseInt(String(valor ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

/** Envuelve un handler para que un fallo inesperado nunca filtre el stack. */
export function conManejoDeErrores(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void>,
) {
  return async (req: VercelRequest, res: VercelResponse): Promise<void> => {
    try {
      await handler(req, res);
    } catch (error) {
      console.error('[api] error inesperado:', error instanceof Error ? error.message : error);
      if (!res.headersSent) {
        fail(res, 'ERROR_INTERNO', 'Algo falló en el servidor. Intenta de nuevo.', 500);
      }
    }
  };
}
