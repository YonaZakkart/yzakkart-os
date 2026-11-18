import type { Comentario, Publicacion } from '../../models/types';
import { el, icono } from '../../os/dom';
import { api, urlImagen } from '../../services/api';
import { crearInsignias } from './Insignias';
import { ReactionBar } from './ReactionBar';
import type { ContextoBlog } from './contexto';
import { fechaLarga, fechaRelativa } from './tiempo';

/** Vista de una publicación con sus comentarios y reacciones. */
export class PostDetailView {
  readonly raiz: HTMLElement;
  private contenido: HTMLElement;
  private barra: ReactionBar | null = null;

  constructor(
    private ctx: ContextoBlog,
    private postId: number,
  ) {
    const volver = el(
      'button',
      { clase: 'btn btn--ghost', attrs: { type: 'button' } },
      icono('inicio', 16),
      el('span', { texto: 'Volver al feed' }),
    );
    volver.addEventListener('click', () => this.ctx.alFeed());

    this.contenido = el('div', { clase: 'detalle' });
    this.raiz = el('div', { clase: 'detalle__wrap' }, volver, this.contenido);
  }

  montar(): void {
    void this.cargar();
  }

  desmontar(): void {
    this.contenido.replaceChildren();
    this.barra = null;
  }

  private async cargar(): Promise<void> {
    this.contenido.replaceChildren(el('p', { clase: 'cargando', texto: 'Cargando…' }));

    try {
      const [{ post }, { comments }] = await Promise.all([
        api.detallePost(this.postId),
        api.listarComentarios(this.postId),
      ]);
      this.pintar(post, comments);
    } catch (error) {
      this.contenido.replaceChildren(
        el(
          'div',
          { clase: 'vacio' },
          el('p', { clase: 'vacio__title', texto: 'No se pudo abrir la publicación' }),
          el('p', { clase: 'vacio__text', texto: error instanceof Error ? error.message : '' }),
        ),
      );
    }
  }

  private pintar(post: Publicacion, comments: Comentario[]): void {
    const usuario = this.ctx.usuario();
    const propia = usuario?.id === post.user_id;

    const articulo = el(
      'article',
      { clase: 'entrada' },
      el(
        'header',
        { clase: 'entrada__meta' },
        el('span', {
          clase: 'avatar avatar--grande',
          texto: post.username.slice(0, 1).toUpperCase(),
        }),
        el(
          'div',
          { clase: 'entrada__quien' },
          this.autorConInsignias(post),
          el('time', { texto: fechaLarga(post.created_at), attrs: { datetime: post.created_at } }),
        ),
      ),
      el('h1', { clase: 'entrada__title', texto: post.title }),
    );

    if (post.updated_at) {
      articulo.append(el('p', { clase: 'entrada__editado', texto: 'editado' }));
    }

    articulo.append(el('div', { clase: 'entrada__body', texto: post.body }));

    if (post.hasImage) {
      articulo.append(
        el('img', {
          clase: 'entrada__imagen',
          attrs: {
            src: urlImagen(post.id, 'full'),
            alt: `Imagen de ${post.title}`,
            loading: 'lazy',
          },
        }),
      );
    }

    if (propia) {
      const editar = el('button', {
        clase: 'btn btn--ghost',
        attrs: { type: 'button' },
        texto: 'Editar',
      });
      editar.addEventListener('click', () => this.ctx.alEditor(post));

      const borrar = el('button', {
        clase: 'btn btn--danger',
        attrs: { type: 'button' },
        texto: 'Eliminar',
      });
      borrar.addEventListener('click', () => void this.eliminar(post));

      articulo.append(el('div', { clase: 'entrada__acciones' }, editar, borrar));
    }

    this.barra = new ReactionBar({
      counts: post.reactiones,
      mia: post.miReaccion,
      alCambiar: async (kind) => {
        if (kind === null) {
          const { counts } = await api.quitarReaccion('post', post.id);
          return counts;
        }
        const { counts } = await api.reaccionar('post', post.id, kind);
        return counts;
      },
    });

    articulo.append(this.barra.raiz);
    this.contenido.replaceChildren(articulo, this.bloqueComentarios(post, comments));
  }

  private autorConInsignias(autor: {
    username: string;
    badge_gold: boolean;
    badge_yz: boolean;
  }): HTMLElement {
    const contenedor = el(
      'span',
      { clase: 'post-card__autor' },
      el('strong', { texto: autor.username }),
    );
    const insignias = crearInsignias(autor);
    if (insignias) contenedor.append(insignias);
    return contenedor;
  }

  private bloqueComentarios(post: Publicacion, comments: Comentario[]): HTMLElement {
    const usuario = this.ctx.usuario();
    const lista = el('div', { clase: 'comentarios__lista' });

    if (comments.length === 0) {
      lista.append(el('p', { clase: 'comentarios__vacio', texto: 'Todavía no hay comentarios.' }));
    }

    for (const comentario of comments) {
      lista.append(this.comentario(comentario, usuario?.id === comentario.user_id));
    }

    const area = el('textarea', {
      clase: 'campo__area campo__area--comentario',
      attrs: {
        placeholder: 'Escribe un comentario…',
        rows: '3',
        maxlength: '1000',
        'aria-label': 'Escribir un comentario',
      },
    });

    const enviar = el(
      'button',
      { clase: 'btn btn--primary', attrs: { type: 'button' } },
      el('span', { texto: 'Comentar' }),
    );

    const aviso = el('p', { clase: 'aviso', attrs: { 'aria-live': 'polite' } });

    enviar.addEventListener('click', async () => {
      const texto = area.value.trim();
      if (!texto) {
        aviso.textContent = 'El comentario no puede estar vacío.';
        return;
      }
      enviar.disabled = true;
      try {
        const { comment } = await api.crearComentario(post.id, texto);
        area.value = '';
        aviso.textContent = '';
        const vacio = lista.querySelector('.comentarios__vacio');
        vacio?.remove();
        lista.append(this.comentario(comment, true));
      } catch (error) {
        aviso.textContent = error instanceof Error ? error.message : 'No se pudo comentar.';
      } finally {
        enviar.disabled = false;
      }
    });

    return el(
      'section',
      { clase: 'comentarios' },
      el('h2', { clase: 'comentarios__title', texto: `Comentarios (${comments.length})` }),
      lista,
      el(
        'div',
        { clase: 'comentarios__form' },
        area,
        el('div', { clase: 'comentarios__pie' }, aviso, enviar),
      ),
    );
  }

  private comentario(comentario: Comentario, propia: boolean): HTMLElement {
    const cuerpo = el('div', { clase: 'comentario__body', texto: comentario.body });

    const contenedor = el(
      'article',
      { clase: 'comentario' },
      el(
        'header',
        { clase: 'comentario__meta' },
        el('span', {
          clase: 'avatar avatar--chico',
          texto: comentario.username.slice(0, 1).toUpperCase(),
        }),
        this.autorConInsignias(comentario),
        el('time', { texto: fechaRelativa(comentario.created_at) }),
        comentario.updated_at
          ? el('span', { clase: 'comentario__editado', texto: 'editado' })
          : null,
      ),
      cuerpo,
    );

    if (propia) {
      const editar = el('button', { clase: 'enlace', attrs: { type: 'button' }, texto: 'Editar' });
      const borrar = el('button', {
        clase: 'enlace enlace--danger',
        attrs: { type: 'button' },
        texto: 'Eliminar',
      });

      editar.addEventListener('click', () => {
        const area = el('textarea', {
          clase: 'campo__area campo__area--comentario',
          attrs: { rows: '3', maxlength: '1000', 'aria-label': 'Editar comentario' },
        });
        area.value = comentario.body;
        const guardar = el('button', {
          clase: 'btn btn--primary',
          attrs: { type: 'button' },
          texto: 'Guardar',
        });
        const cancelar = el('button', {
          clase: 'btn btn--ghost',
          attrs: { type: 'button' },
          texto: 'Cancelar',
        });

        guardar.addEventListener('click', async () => {
          guardar.disabled = true;
          try {
            const { comment } = await api.editarComentario(comentario.id, area.value.trim());
            cuerpo.textContent = comment.body;
            editor.remove();
            cuerpo.hidden = false;
          } catch (error) {
            window.alert(error instanceof Error ? error.message : 'No se pudo guardar.');
            guardar.disabled = false;
          }
        });
        cancelar.addEventListener('click', () => {
          editor.remove();
          cuerpo.hidden = false;
        });

        const editor = el(
          'div',
          { clase: 'comentario__editor' },
          area,
          el('div', { clase: 'comentario__editor-acciones' }, cancelar, guardar),
        );
        cuerpo.hidden = true;
        contenedor.append(editor);
        area.focus();
      });

      borrar.addEventListener('click', async () => {
        if (!window.confirm('¿Eliminar este comentario?')) return;
        try {
          await api.eliminarComentario(comentario.id);
          contenedor.remove();
        } catch (error) {
          window.alert(error instanceof Error ? error.message : 'No se pudo eliminar.');
        }
      });

      contenedor.append(el('div', { clase: 'comentario__acciones' }, editar, borrar));
    }

    const reacciones = new ReactionBar({
      counts: comentario.reactiones,
      mia: comentario.miReaccion,
      alCambiar: async (kind) => {
        if (kind === null) {
          const { counts } = await api.quitarReaccion('comment', comentario.id);
          return counts;
        }
        const { counts } = await api.reaccionar('comment', comentario.id, kind);
        return counts;
      },
    });

    contenedor.append(reacciones.raiz);
    return contenedor;
  }

  private async eliminar(post: Publicacion): Promise<void> {
    if (!window.confirm(`¿Eliminar "${post.title}"? También se borrarán sus comentarios.`)) return;
    try {
      await api.eliminarPost(post.id);
      this.ctx.alFeed();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No se pudo eliminar.');
    }
  }
}
