# YZakkartOS

Una computadora completa dentro del navegador.

El sitio abre en una mesa con una PC apagada. Al encenderla, el navegador se convierte en
**YZakkartOS**: un escritorio con ventanas, un navegador que abre **YZakkart-Blog** (un blog real y
compartido) y una terminal con comandos y alguna que otra trampa.

- **Sistema**: YZakkartOS (escritorio) · YZakkart Mobile (teléfonos)
- **Blog**: YZakkart-Blog
- **Datos**: SQLite en la nube (Turso / libSQL)
- **Despliegue**: Vercel

## Probar el CRUD en un minuto

1. Abre el sitio y haz clic en la PC.
2. Espera el arranque y abre el icono **Navegador**.
3. Ya eres `Invitado_XXXX`: pulsa **Publicar**, escribe un título y un texto, guarda.
4. Abre tu publicación para **editarla**, **comentarla** y **reaccionar**.
5. Recarga la página: todo sigue ahí.

No hace falta registrarse. Si quieres probar el registro, entra en tu cuenta desde el encabezado del
blog: el código de verificación se muestra en pantalla (el proyecto no envía correos reales).

## La broma

El blog tiene una publicación que recomienda un comando para "tener más FPS". Ábrela, ve a la
Terminal y ejecútalo. No borra nada de verdad: apaga la PC virtual.

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
pnpm dev          # frontend + funciones de api/ (servidor local propio)
```

`pnpm dev` monta las funciones de `api/` dentro del servidor de Vite y lee `.env.local`, así que el
blog funciona sin instalar la CLI de Vercel.

Para usar la CLI de Vercel:

```bash
vercel env pull   # baja las variables del proyecto
vercel dev        # frontend + api/ con el runtime de Vercel
```

Verificaciones:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Base de datos

Variables de entorno necesarias (en `.env.local` y en Vercel → Settings → Environment Variables):

```
TURSO_DATABASE_URL=...
TURSO_AUTH_TOKEN=...
```

Carga inicial (una sola vez por entorno):

```bash
turso db shell yzakkart-os < lib/schema.sql
turso db shell yzakkart-os < lib/seed.sql
```

La semilla borra el contenido actual y crea 12 publicaciones, 25 comentarios y 26 reacciones de
usuarios ficticios.

## Despliegue

1. Importar el repositorio en Vercel (framework **Vite**).
2. Añadir `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN` en Production, Preview y Development.
3. Deploy. `vercel.json` ya define el build, las funciones y el rewrite del SPA.

## Estructura

```
server/  fuentes de las funciones serverless (auth, posts, comments, reactions, image)
api/     funciones empaquetadas por esbuild (generadas, se versionan para Vercel)
lib/     código compartido del servidor (db, auth, validate, http, SQL)
public/  estáticos (favicon, wallpapers)
src/     frontend: os/, apps/, models/, services/, styles/
scripts/ empaquetado de las funciones
```

Cada función de `server/` se empaqueta en un único archivo dentro de `api/` con `pnpm build:api`.
Vercel transpila cada archivo por separado y no resuelve imports relativos sin extensión en ESM, así
que la función viaja autocontenida.

## Licencia

Proyecto personal con fines educativos.
