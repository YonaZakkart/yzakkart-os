import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../lib/db';
import { conManejoDeErrores, entero, fail } from '../lib/http';

/**
 * Sirve la imagen de una publicación desde la base.
 * Cache inmutable: el id y updated_at forman el ETag.
 */
async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    fail(res, 'METODO_NO_PERMITIDO', 'Método no permitido.', 405);
    return;
  }

  const id = entero(req.query.id);
  if (!id) {
    fail(res, 'SOLICITUD_INVALIDA', 'Falta el identificador de la publicación.', 400);
    return;
  }

  const resultado = await getDb().execute({
    sql: 'SELECT image, updated_at FROM posts WHERE id = ?',
    args: [id],
  });
  const fila = resultado.rows[0];
  const dataUrl = fila?.image ? String(fila.image) : null;

  if (!dataUrl) {
    fail(res, 'NO_ENCONTRADO', 'Esa publicación no tiene imagen.', 404);
    return;
  }

  const coincidencia = /^data:(image\/(?:webp|jpeg|png));base64,(.+)$/.exec(dataUrl);
  if (!coincidencia) {
    fail(res, 'ERROR_INTERNO', 'La imagen guardada no es válida.', 500);
    return;
  }

  const mime = coincidencia[1];
  const buffer = Buffer.from(coincidencia[2], 'base64');
  const etag = `"${id}-${fila?.updated_at ?? '0'}"`;

  res.setHeader('Content-Type', mime);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.setHeader('ETag', etag);

  if (req.headers['if-none-match'] === etag) {
    res.status(304).end();
    return;
  }

  res.status(200).send(buffer);
}

export default conManejoDeErrores(handler);
