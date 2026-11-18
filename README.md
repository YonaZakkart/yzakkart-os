# YZakkartOS

Una computadora completa dentro del navegador.

El sitio abre en una mesa con una PC apagada. Al encenderla, el navegador se convierte en
**YZakkartOS**: un escritorio con ventanas, un navegador que abre **YZakkart-Blog** (un blog real y
compartido) y una terminal con comandos y alguna que otra trampa.

- **Sistema**: YZakkartOS (escritorio) · YZakkart Mobile (teléfonos)
- **Blog**: YZakkart-Blog
- **Datos**: SQLite en la nube (Turso / libSQL)
- **Despliegue**: Vercel

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | Vite + TypeScript, DOM y CSS propios (sin framework) |
| Backend | Funciones serverless de Vercel (`api/`) |
| Base de datos | Turso (libSQL) con `@libsql/client` |
| Contraseñas | bcryptjs |

## Desarrollo

```bash
pnpm install
pnpm dev          # solo frontend
vercel dev        # frontend + funciones de api/ (recomendado)
```

Verificaciones:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Base de datos

Variables de entorno necesarias (en `.env.local` y en Vercel):

```
TURSO_DATABASE_URL=...
TURSO_AUTH_TOKEN=...
```

Carga inicial:

```bash
turso db shell yzakkart-os < lib/schema.sql
turso db shell yzakkart-os < lib/seed.sql
```

## Licencia

Proyecto personal con fines educativos.
