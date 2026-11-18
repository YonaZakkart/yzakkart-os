import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const base = { servicio: 'yzakkart-os', version: '1.0.0', ahora: new Date().toISOString() };

  if (req.method !== 'GET') {
    res
      .status(405)
      .json({ ok: false, error: { code: 'METODO_NO_PERMITIDO', message: 'Usa GET.' } });
    return;
  }

  res.status(200).json({
    ok: true,
    data: { ...base, estado: 'vivo', baseDeDatos: Boolean(process.env.TURSO_DATABASE_URL) },
  });
}
