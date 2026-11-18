import type { Publicacion, Usuario } from '../../models/types';
import { el, icono } from '../../os/dom';
import { sesion } from '../../services/session';
import { AccountView } from './AccountView';
import { FeedView } from './FeedView';
import { crearInsignias } from './Insignias';
import { PostDetailView } from './PostDetailView';
import { PostEditorView } from './PostEditorView';
import { Theme } from './Theme';
import type { ContextoBlog } from './contexto';

interface Vista {
  montar(): void;
  desmontar(): void;
}

/** YZakkart-Blog: feed, detalle, editor y cuenta dentro de una ventana. */
export class BlogApp implements ContextoBlog {
  private raiz: HTMLElement;
  private principal: HTMLElement;
  private botonCuenta: HTMLButtonElement;
  private botonTema: HTMLButtonElement;
  private tema = new Theme();
  private usuarioActual: Usuario | null = null;
  private vista: Vista | null = null;

  constructor(
    contenedor: HTMLElement,
    private alCerrar: () => void,
  ) {
    this.botonTema = el('button', {
      clase: 'blog__icono',
      attrs: { type: 'button', 'aria-label': 'Cambiar tema', title: 'Cambiar tema' },
    });

    this.botonCuenta = el('button', {
      clase: 'blog__cuenta',
      attrs: { type: 'button', title: 'Tu cuenta' },
    });

    const marca = el(
      'button',
      { clase: 'blog__marca', attrs: { type: 'button', 'aria-label': 'Ir al inicio del blog' } },
      el('img', { clase: 'blog__logo', attrs: { src: '/favicon.svg', alt: '' } }),
      el('span', { clase: 'blog__nombre', texto: 'YZakkart-Blog' }),
    );
    marca.addEventListener('click', () => this.alFeed());

    const cerrar = el(
      'button',
      {
        clase: 'blog__icono blog__icono--cerrar',
        attrs: {
          type: 'button',
          'aria-label': 'Cerrar el navegador',
          title: 'Cerrar el navegador (no apaga la PC)',
        },
      },
      icono('cerrar', 18),
    );
    cerrar.addEventListener('click', () => this.alCerrar());

    const encabezado = el(
      'header',
      { clase: 'blog__header' },
      marca,
      el('div', { clase: 'blog__acciones' }, this.botonTema, this.botonCuenta, cerrar),
    );

    this.principal = el('main', { clase: 'blog__main' });
    this.raiz = el('div', { clase: 'blog' }, encabezado, this.principal);

    this.botonTema.addEventListener('click', () => {
      const nuevo = this.tema.alternar(this.raiz);
      this.pintarIconoTema();
      this.botonTema.title = nuevo === 'dark' ? 'Tema claro' : 'Tema oscuro';
    });
    this.botonCuenta.addEventListener('click', () => this.alCuenta());

    contenedor.append(this.raiz);
  }

  montar(): void {
    this.tema.aplicar(this.raiz);
    this.pintarIconoTema();
    this.actualizarEncabezado();

    /* El feed no espera a la sesión: aparece ya y el nombre llega después. */
    this.alFeed();
    void this.cargarSesion();
  }

  private async cargarSesion(): Promise<void> {
    try {
      this.usuarioActual = await sesion.asegurar();
    } catch {
      this.usuarioActual = null;
    }
    this.actualizarEncabezado();
  }

  desmontar(): void {
    this.vista?.desmontar();
    this.vista = null;
    this.raiz.remove();
  }

  /* ---------- ContextoBlog ---------- */

  usuario(): Usuario | null {
    return this.usuarioActual;
  }

  alFeed(): void {
    this.mostrar(new FeedView(this));
  }

  alDetalle(id: number): void {
    this.mostrar(new PostDetailView(this, id));
  }

  alEditor(publicacion?: Publicacion): void {
    this.mostrar(new PostEditorView(this, publicacion));
  }

  alCuenta(): void {
    this.mostrar(new AccountView(this));
  }

  actualizarEncabezado(): void {
    const nombre = this.usuarioActual?.username ?? 'invitado';
    const insignias = crearInsignias({
      badge_gold: this.usuarioActual?.badge_gold === 1,
      badge_yz: this.usuarioActual?.badge_yz === 1,
    });

    this.botonCuenta.replaceChildren(
      el('span', { clase: 'blog__avatar', texto: nombre.slice(0, 1).toUpperCase() }),
      el('span', { clase: 'blog__usuario', texto: nombre }),
      ...(insignias ? [insignias] : []),
    );
    this.botonCuenta.title =
      this.usuarioActual?.is_guest === 0 ? 'Cuenta verificada' : 'Estás como invitado';
  }

  /* ---------- Interno ---------- */

  private mostrar(vista: Vista): void {
    this.vista?.desmontar();
    this.principal.replaceChildren();
    this.vista = vista;
    this.principal.append((vista as unknown as { raiz: HTMLElement }).raiz);
    vista.montar();
    this.principal.scrollTop = 0;
  }

  private pintarIconoTema(): void {
    const oscuro = this.tema.actual === 'dark';
    this.botonTema.replaceChildren(icono(oscuro ? 'sol' : 'luna', 18));
    this.botonTema.setAttribute(
      'aria-label',
      oscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro',
    );
  }
}
