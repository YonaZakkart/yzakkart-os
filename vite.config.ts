import { readFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { type Plugin, defineConfig } from 'vite';

/**
 * Carga .env.local en process.env para el servidor de desarrollo.
 * En producción las variables llegan desde Vercel.
 */
function cargarEntorno(): void {
  try {
    const texto = readFileSync('.env.local', 'utf8');
    for (const linea of texto.split('\n')) {
      const limpia = linea.trim();
      if (!limpia || limpia.startsWith('#')) continue;
      const corte = limpia.indexOf('=');
      if (corte < 0) continue;
      const clave = limpia.slice(0, corte).trim();
      const valor = limpia
        .slice(corte + 1)
        .trim()
        .replace(/^["']|["']$/g, '');
      if (clave && !(clave in process.env)) process.env[clave] = valor;
    }
  } catch {
    /* sin .env.local: la API responderá su error de configuración */
  }
}

async function leerCuerpo(req: IncomingMessage): Promise<unknown> {
  const partes: Buffer[] = [];
  for await (const parte of req) partes.push(parte as Buffer);
  if (partes.length === 0) return null;
  const texto = Buffer.concat(partes).toString('utf8');
  try {
    return JSON.parse(texto);
  } catch {
    return texto;
  }
}

function respuestaFalsa(res: ServerResponse) {
  let enviado = false;
  const falsa = {
    status(codigo: number) {
      res.statusCode = codigo;
      return falsa;
    },
    json(datos: unknown) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(datos));
      enviado = true;
      return falsa;
    },
    send(datos: unknown) {
      res.end(datos as Buffer);
      enviado = true;
      return falsa;
    },
    end(datos?: unknown) {
      res.end(datos as Buffer | undefined);
      enviado = true;
      return falsa;
    },
    setHeader(clave: string, valor: string | number) {
      res.setHeader(clave, valor);
    },
    get headersSent() {
      return enviado || res.headersSent;
    },
  };
  return falsa;
}

/** Ejecuta las funciones de api/ dentro del servidor de Vite (solo desarrollo). */
function apiLocal(): Plugin {
  return {
    name: 'yzakkart-api-local',
    apply: 'serve',
    configureServer(servidor) {
      cargarEntorno();

      servidor.middlewares.use(async (req, res, siguiente) => {
        const url = new URL(req.url ?? '/', 'http://localhost');

        if (!url.pathname.startsWith('/api/')) return siguiente();

        const nombre = url.pathname.slice('/api/'.length).replace(/\.ts$/, '');
        const consulta: Record<string, string> = {};
        url.searchParams.forEach((valor, clave) => {
          consulta[clave] = valor;
        });

        try {
          const modulo = await servidor.ssrLoadModule(`/api/${nombre}.ts`);
          const manejador = modulo.default as (req: unknown, res: unknown) => Promise<void>;

          const cuerpo =
            req.method === 'GET' || req.method === 'HEAD' ? null : await leerCuerpo(req);

          await manejador(
            { method: req.method, query: consulta, body: cuerpo, headers: req.headers },
            respuestaFalsa(res),
          );
        } catch (error) {
          console.error(`[api/${nombre}]`, error);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(
              JSON.stringify({
                ok: false,
                error: { code: 'ERROR_INTERNO', message: 'Fallo el servidor de desarrollo.' },
              }),
            );
          }
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [apiLocal()],
  build: {
    target: 'es2022',
    outDir: 'dist',
    emptyOutDir: true,
  },
  preview: {
    port: 5181,
    proxy: {
      '/api': 'http://localhost:5180',
    },
  },
});
