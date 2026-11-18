import type { OrdenFeed, Publicacion } from '../../models/types';
import { el, icono } from '../../os/dom';
import { api, urlImagen } from '../../services/api';
import { crearInsignias } from './Insignias';
import type { ContextoBlog } from './contexto';
import { fechaRelativa } from './tiempo';

const LOTE = 10;

const ORDENES: { valor: OrdenFeed; etiqueta: string }[] = [
  { valor: 'recientes', etiqueta: 'Más recientes' },
  { valor: 'antiguos', etiqueta: 'Más antiguos' },
  { valor: 'comentados', etiqueta: 'Más comentados' },
];

/** Feed de publicaciones con orden configurable y lotes que no repiten. */
export class FeedView {
  readonly raiz: HTMLElement;
  private lista: HTMLElement;
  private botonActualizar: HTMLButtonElement;
  private selector: HTMLSelectElement;
  private vistos = new Set<number>();
  private cargando = false;
  private orden: OrdenFeed = 'recientes';

  constructor(private ctx: ContextoBlog) {
    this.botonActualizar = el(
      'button',
      { clase: 'btn btn--ghost', attrs: { type: 'button' } },
      icono('navegador', 16),
      el('span', { texto: 'Actualizar' }),
    );

    const publicar = el(
      'button',
      { clase: 'btn btn--primary', attrs: { type: 'button' } },
      icono('imagen', 16),
      el('span', { texto: 'Publicar' }),
    );
    publicar.addEventListener('click', () => this.ctx.alEditor());

    this.selector = el('select', {
      clase: 'feed__orden',
      attrs: { 'aria-label': 'Ordenar publicaciones' },
    });
    for (const orden of ORDENES) {
      const opcion = el('option', { attrs: { value: orden.valor }, texto: orden.etiqueta });
      this.selector.append(opcion);
    }
    this.selector.addEventListener('change', () => {
      this.orden = this.selector.value as OrdenFeed;
      void this.cargar(true);
    });

    this.lista = el('div', { clase: 'feed__list', attrs: { 'aria-live': 'polite' } });

    this.raiz = el(
      'div',
      { clase: 'feed' },
      el(
        'div',
        { clase: 'feed__bar' },
        el(
          'div',
          {},
          el('h2', { clase: 'feed__title', texto: 'Últimas publicaciones' }),
          el('p', { clase: 'feed__sub', texto: 'Un blog del sistema, sobre el sistema.' }),
        ),
        el('div', { clase: 'feed__controles' }, this.selector, this.botonActualizar, publicar),
      ),
      this.lista,
    );

    this.botonActualizar.addEventListener('click', () => void this.cargar(false));
  }

  montar(): void {
    void this.cargar(true);
  }

  desmontar(): void {
    this.lista.replaceChildren();
  }

  private async cargar(reiniciar: boolean): Promise<void> {
    if (this.cargando) return;
    this.cargando = true;
    this.botonActualizar.disabled = true;

    if (reiniciar) {
      this.vistos.clear();
      this.lista.replaceChildren(this.esqueleto(), this.esqueleto());
    }

    try {
      let posts = await this.pedir();

      /* Si el lote se agotó, se reinicia el ciclo una sola vez. */
      if (posts.length === 0 && this.vistos.size > 0) {
        this.vistos.clear();
        posts = await this.pedir();
      }

      if (posts.length === 0) {
        if (reiniciar) this.lista.replaceChildren(this.vacio());
        return;
      }

      if (reiniciar) this.lista.replaceChildren();

      for (const post of posts) {
        this.vistos.add(post.id);
        this.lista.append(this.tarjeta(post));
      }
    } catch (error) {
      if (reiniciar) this.lista.replaceChildren(this.error(error));
    } finally {
      this.cargando = false;
      this.botonActualizar.disabled = false;
    }
  }

  private async pedir(): Promise<Publicacion[]> {
    const { posts } = await api.listarPosts([...this.vistos], LOTE, this.orden);
    return posts;
  }

  private tarjeta(post: Publicacion): HTMLElement {
    const usuario = this.ctx.usuario();
    const propia = usuario?.id === post.user_id || usuario?.is_admin === 1;

    const autor = el('span', { clase: 'post-card__autor' }, el('strong', { texto: post.username }));
    const insignias = crearInsignias(post);
    if (insignias) autor.append(insignias);

    const cabecera = el(
      'header',
      { clase: 'post-card__meta' },
      el('span', { clase: 'avatar', texto: post.username.slice(0, 1).toUpperCase() }),
      el(
        'div',
        { clase: 'post-card__quien' },
        autor,
        el('time', { texto: fechaRelativa(post.created_at) }),
      ),
    );

    if (propia) {
      const editar = el('button', {
        clase: 'post-card__accion',
        attrs: { type: 'button', 'aria-label': 'Editar publicación', title: 'Editar' },
        texto: 'Editar',
      });
      editar.addEventListener('click', (evento) => {
        evento.stopPropagation();
        this.ctx.alEditor(post);
      });

      const borrar = el('button', {
        clase: 'post-card__accion post-card__accion--danger',
        attrs: { type: 'button', 'aria-label': 'Eliminar publicación', title: 'Eliminar' },
        texto: 'Eliminar',
      });
      borrar.addEventListener('click', (evento) => {
        evento.stopPropagation();
        void this.eliminar(post);
      });

      cabecera.append(el('div', { clase: 'post-card__acciones' }, editar, borrar));
    }

    const tarjeta = el(
      'article',
      {
        clase: 'post-card',
        attrs: { tabindex: '0', role: 'button', 'aria-label': `Leer ${post.title}` },
      },
      cabecera,
      el('h3', { clase: 'post-card__title', texto: post.title }),
      el('p', { clase: 'post-card__excerpt', texto: post.body.slice(0, 320) }),
    );

    if (post.hasImage) {
      tarjeta.append(
        el('img', {
          clase: 'post-card__thumb',
          attrs: {
            src: urlImagen(post.id, 'thumb'),
            alt: `Imagen de ${post.title}`,
            loading: 'lazy',
          },
        }),
      );
    }

    const reacciones = Object.values(post.reactiones).reduce((total, n) => total + n, 0);

    tarjeta.append(
      el(
        'footer',
        { clase: 'post-card__footer' },
        el('span', { clase: 'chip', texto: `${reacciones} reacciones` }),
        el('span', { clase: 'chip', texto: `${post.comentarios} comentarios` }),
        el('span', { clase: 'chip chip--leer', texto: 'Leer más →' }),
      ),
    );

    const abrir = (): void => this.ctx.alDetalle(post.id);
    tarjeta.addEventListener('click', abrir);
    tarjeta.addEventListener('keydown', (evento) => {
      if (evento.key === 'Enter' || evento.key === ' ') {
        evento.preventDefault();
        abrir();
      }
    });

    return tarjeta;
  }

  private async eliminar(post: Publicacion): Promise<void> {
    const confirmado = window.confirm(
      `¿Eliminar "${post.title}"? También se borrarán sus comentarios.`,
    );
    if (!confirmado) return;

    try {
      await api.eliminarPost(post.id);
      this.vistos.delete(post.id);
      const tarjetas = this.lista.querySelectorAll<HTMLElement>('.post-card');
      for (const tarjeta of tarjetas) {
        if (tarjeta.textContent?.includes(post.title)) tarjeta.remove();
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No se pudo eliminar.');
    }
  }

  private esqueleto(): HTMLElement {
    return el(
      'div',
      { clase: 'post-card post-card--cargando', attrs: { 'aria-hidden': 'true' } },
      el('div', { clase: 'skeleton skeleton--linea' }),
      el('div', { clase: 'skeleton skeleton--titulo' }),
      el('div', { clase: 'skeleton skeleton--linea' }),
    );
  }

  private vacio(): HTMLElement {
    return el(
      'div',
      { clase: 'vacio' },
      el('p', { clase: 'vacio__title', texto: 'Todavía no hay publicaciones.' }),
      el('p', { clase: 'vacio__text', texto: 'Sé la primera persona en escribir algo.' }),
    );
  }

  private error(error: unknown): HTMLElement {
    const mensaje = error instanceof Error ? error.message : 'No se pudo cargar el blog.';
    const caja = el(
      'div',
      { clase: 'vacio' },
      el('p', { clase: 'vacio__title', texto: 'No se pudo cargar el blog' }),
      el('p', { clase: 'vacio__text', texto: mensaje }),
    );
    const reintentar = el('button', {
      clase: 'btn btn--primary',
      attrs: { type: 'button' },
      texto: 'Reintentar',
    });
    reintentar.addEventListener('click', () => void this.cargar(true));
    caja.append(reintentar);
    return caja;
  }
}
