import { createRequire as __crearRequire } from 'node:module';
const require = __crearRequire(import.meta.url);

// server/salud.ts
function handler(req, res) {
  const base = { servicio: "yzakkart-os", version: "1.0.0", ahora: (/* @__PURE__ */ new Date()).toISOString() };
  if (req.method !== "GET") {
    res.status(405).json({ ok: false, error: { code: "METODO_NO_PERMITIDO", message: "Usa GET." } });
    return;
  }
  res.status(200).json({
    ok: true,
    data: { ...base, estado: "vivo", baseDeDatos: Boolean(process.env.TURSO_DATABASE_URL) }
  });
}
export {
  handler as default
};
