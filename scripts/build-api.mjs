import { mkdir, readdir, rm } from 'node:fs/promises';
import { build } from 'esbuild';

/**
 * Empaqueta cada función de `server/` en un único archivo autocontenido
 * dentro de `api/`.
 *
 * Vercel transpila cada archivo de `api/` por separado y no empaqueta:
 * un `import '../lib/auth'` sin extensión falla en Node ESM y `lib/`
 * no forma parte del bundle de la función. Al bundlear aquí, cada
 * endpoint viaja completo y no depende de cómo resuelva Vercel.
 */

const ENTRADA = 'server';
const SALIDA = 'api';
const EXTERNOS = ['@libsql/client', 'bcryptjs'];

const archivos = (await readdir(ENTRADA)).filter(
  (nombre) => nombre.endsWith('.ts') && !nombre.startsWith('_'),
);

await rm(SALIDA, { recursive: true, force: true });
await mkdir(SALIDA, { recursive: true });

for (const archivo of archivos) {
  const nombre = archivo.replace(/\.ts$/, '.js');

  await build({
    entryPoints: [`${ENTRADA}/${archivo}`],
    outfile: `${SALIDA}/${nombre}`,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    external: EXTERNOS,
    legalComments: 'none',
    logLevel: 'warning',
    /* Las dependencias externas en CommonJS pueden necesitar `require`. */
    banner: {
      js: [
        "import { createRequire as __crearRequire } from 'node:module';",
        'const require = __crearRequire(import.meta.url);',
      ].join('\n'),
    },
  });

  console.log(`  api/${nombre}`);
}

console.log(`Empaquetadas ${archivos.length} funciones en ${SALIDA}/`);
