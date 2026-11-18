import { createRequire as __crearRequire } from 'node:module';
const require = __crearRequire(import.meta.url);

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
function fail(res, code, message, status = 400) {
  res.status(status).json({ ok: false, error: { code, message } });
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

// server/image.ts
async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    fail(res, "METODO_NO_PERMITIDO", "M\xE9todo no permitido.", 405);
    return;
  }
  const id = entero(req.query.id);
  if (!id) {
    fail(res, "SOLICITUD_INVALIDA", "Falta el identificador de la publicaci\xF3n.", 400);
    return;
  }
  const resultado = await getDb().execute({
    sql: "SELECT image, updated_at FROM posts WHERE id = ?",
    args: [id]
  });
  const fila = resultado.rows[0];
  const dataUrl = fila?.image ? String(fila.image) : null;
  if (!dataUrl) {
    fail(res, "NO_ENCONTRADO", "Esa publicaci\xF3n no tiene imagen.", 404);
    return;
  }
  const coincidencia = /^data:(image\/(?:webp|jpeg|png));base64,(.+)$/.exec(dataUrl);
  if (!coincidencia) {
    fail(res, "ERROR_INTERNO", "La imagen guardada no es v\xE1lida.", 500);
    return;
  }
  const mime = coincidencia[1];
  const buffer = Buffer.from(coincidencia[2], "base64");
  const etag = `"${id}-${fila?.updated_at ?? "0"}"`;
  res.setHeader("Content-Type", mime);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.setHeader("ETag", etag);
  if (req.headers["if-none-match"] === etag) {
    res.status(304).end();
    return;
  }
  res.status(200).send(buffer);
}
var image_default = conManejoDeErrores(handler);
export {
  image_default as default
};
