import { describe, expect, it } from 'vitest';

/**
 * Pruebas de integración del backend contra la base real.
 * Se saltan si no hay variables de Turso en el entorno.
 *
 * Ejecutar con:
 *   node --env-file=.env.local ./node_modules/vitest/vitest.mjs run tests/api.test.ts
 */

const hayBase = Boolean(process.env.TURSO_DATABASE_URL);

interface RespuestaFalsa {
  statusCode: number;
  cuerpo: any;
  headers: Record<string, string>;
}

function crearRes() {
  const estado: RespuestaFalsa = { statusCode: 200, cuerpo: null, headers: {} };
  const res: any = {
    status(codigo: number) {
      estado.statusCode = codigo;
      return res;
    },
    json(cuerpo: unknown) {
      estado.cuerpo = cuerpo;
      return res;
    },
    send(cuerpo: unknown) {
      estado.cuerpo = cuerpo;
      return res;
    },
    end() {
      return res;
    },
    setHeader(clave: string, valor: string) {
      estado.headers[clave] = valor;
    },
    get headersSent() {
      return estado.cuerpo !== null;
    },
  };
  return { res, estado };
}

async function llamar(
  handler: any,
  opciones: {
    method: string;
    query?: Record<string, string>;
    body?: unknown;
    token?: string;
  },
) {
  const { res, estado } = crearRes();
  const req: any = {
    method: opciones.method,
    query: opciones.query ?? {},
    body: opciones.body ?? null,
    headers: opciones.token ? { authorization: `Bearer ${opciones.token}` } : {},
  };
  await handler(req, res);
  return estado;
}

describe.skipIf(!hayBase)('API completa contra Turso', () => {
  it('recorre invitado, CRUD, reacciones y registro', async () => {
    const auth = (await import('../server/auth')).default;
    const posts = (await import('../server/posts')).default;
    const comments = (await import('../server/comments')).default;
    const reactions = (await import('../server/reactions')).default;

    // 1. Invitado
    const invitado = await llamar(auth, { method: 'POST', query: { action: 'guest' } });
    expect(invitado.statusCode).toBe(201);
    expect(invitado.cuerpo.ok).toBe(true);
    const token: string = invitado.cuerpo.data.token;
    const userId: number = invitado.cuerpo.data.user.id;
    expect(invitado.cuerpo.data.user.username).toMatch(/^Invitado_\d{4}$/);

    // 2. me
    const yo = await llamar(auth, { method: 'GET', query: { action: 'me' }, token });
    expect(yo.statusCode).toBe(200);
    expect(yo.cuerpo.data.user.id).toBe(userId);

    // 3. Crear publicación
    const creada = await llamar(posts, {
      method: 'POST',
      token,
      body: { title: 'Prueba de integración', body: 'Contenido de prueba.' },
    });
    expect(creada.statusCode).toBe(201);
    const postId: number = creada.cuerpo.data.post.id;

    // 4. Listar
    const lista = await llamar(posts, { method: 'GET', query: { action: 'list', limit: '10' } });
    expect(lista.cuerpo.data.posts.some((p: any) => p.id === postId)).toBe(true);

    // 5. Detalle
    const detalle = await llamar(posts, {
      method: 'GET',
      query: { action: 'detail', id: String(postId) },
    });
    expect(detalle.cuerpo.data.post.title).toBe('Prueba de integración');

    // 6. Comentario
    const comentario = await llamar(comments, {
      method: 'POST',
      token,
      body: { postId, body: 'Un comentario de prueba.' },
    });
    expect(comentario.statusCode).toBe(201);

    const comentarios = await llamar(comments, {
      method: 'GET',
      query: { postId: String(postId) },
    });
    expect(comentarios.cuerpo.data.comments).toHaveLength(1);

    // 7. Reacción: poner, cambiar, quitar
    const puesta = await llamar(reactions, {
      method: 'POST',
      query: { action: 'set' },
      token,
      body: { target: 'post', id: postId, kind: 'me_gusta' },
    });
    expect(puesta.cuerpo.data.counts.me_gusta).toBe(1);

    const cambiada = await llamar(reactions, {
      method: 'POST',
      query: { action: 'set' },
      token,
      body: { target: 'post', id: postId, kind: 'risa' },
    });
    expect(cambiada.cuerpo.data.counts.risa).toBe(1);
    expect(cambiada.cuerpo.data.counts.me_gusta ?? 0).toBe(0);

    const quitada = await llamar(reactions, {
      method: 'POST',
      query: { action: 'remove' },
      token,
      body: { target: 'post', id: postId },
    });
    expect(Object.keys(quitada.cuerpo.data.counts)).toHaveLength(0);

    // 8. Editar
    const editada = await llamar(posts, {
      method: 'PATCH',
      query: { id: String(postId) },
      token,
      body: { title: 'Título editado' },
    });
    expect(editada.cuerpo.data.post.title).toBe('Título editado');
    expect(editada.cuerpo.data.post.updated_at).not.toBeNull();

    // 9. Eliminar
    const borrada = await llamar(posts, {
      method: 'DELETE',
      query: { id: String(postId) },
      token,
    });
    expect(borrada.cuerpo.ok).toBe(true);

    const sinComentarios = await llamar(comments, {
      method: 'GET',
      query: { postId: String(postId) },
    });
    expect(sinComentarios.cuerpo.data.comments).toHaveLength(0);

    // 10. Registro con verificación
    const registro = await llamar(auth, {
      method: 'POST',
      query: { action: 'register' },
      token,
      body: {
        username: `prueba_${Date.now() % 100000}`,
        password: 'secreta123',
        email: 'prueba@ejemplo.com',
      },
    });
    expect(registro.statusCode).toBe(200);
    const codigo: string = registro.cuerpo.data.code;
    expect(codigo).toMatch(/^\d{6}$/);

    const malCodigo = await llamar(auth, {
      method: 'POST',
      query: { action: 'verify' },
      token,
      body: { code: codigo === '000000' ? '111111' : '000000' },
    });
    expect(malCodigo.statusCode).toBe(400);
    expect(malCodigo.cuerpo.error.code).toBe('CODIGO_INVALIDO');

    const verificado = await llamar(auth, {
      method: 'POST',
      query: { action: 'verify' },
      token,
      body: { code: codigo },
    });
    expect(verificado.statusCode).toBe(200);
    expect(verificado.cuerpo.data.user.is_guest).toBe(0);
    const nuevoToken: string = verificado.cuerpo.data.token;
    const username: string = verificado.cuerpo.data.user.username;

    // 11. Login
    const login = await llamar(auth, {
      method: 'POST',
      query: { action: 'login' },
      body: { username, password: 'secreta123' },
    });
    expect(login.statusCode).toBe(200);

    const malLogin = await llamar(auth, {
      method: 'POST',
      query: { action: 'login' },
      body: { username, password: 'incorrecta' },
    });
    expect(malLogin.statusCode).toBe(401);

    // 12. Logout
    const salida = await llamar(auth, {
      method: 'POST',
      query: { action: 'logout' },
      token: nuevoToken,
    });
    expect(salida.cuerpo.ok).toBe(true);

    const sinSesion = await llamar(auth, {
      method: 'GET',
      query: { action: 'me' },
      token: nuevoToken,
    });
    expect(sinSesion.statusCode).toBe(401);

    // Limpieza
    const { getDb } = await import('../lib/db');
    const db = getDb();
    await db.batch(
      [
        { sql: 'DELETE FROM comment_reactions WHERE user_id = ?', args: [userId] },
        { sql: 'DELETE FROM post_reactions WHERE user_id = ?', args: [userId] },
        { sql: 'DELETE FROM comments WHERE user_id = ?', args: [userId] },
        { sql: 'DELETE FROM posts WHERE user_id = ?', args: [userId] },
        { sql: 'DELETE FROM pending_verifications WHERE user_id = ?', args: [userId] },
        { sql: 'DELETE FROM sessions WHERE user_id = ?', args: [userId] },
        { sql: 'DELETE FROM users WHERE id = ?', args: [userId] },
      ],
      'write',
    );
  });
});
