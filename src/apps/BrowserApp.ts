import { AppBase } from '../os/App';
import type { ContextoOS } from '../os/contexto';
import { el, icono } from '../os/dom';
import { BlogApp } from './blog/BlogApp';

/**
 * App Navegador: barra de dirección decorativa y YZakkart-Blog dentro.
 * La [X] del blog cierra la aplicación, no la PC.
 */
export class BrowserApp extends AppBase {
  readonly id = 'navegador';
  readonly titulo = 'Navegador';
  readonly icono = 'navegador';

  private blog: BlogApp | null = null;

  constructor(private ctx: ContextoOS) {
    super();
  }

  protected construir(contenedor: HTMLElement): void {
    const barra = el(
      'div',
      { clase: 'browser__bar' },
      el(
        'div',
        { clase: 'browser__dots', attrs: { 'aria-hidden': 'true' } },
        el('span'),
        el('span'),
        el('span'),
      ),
      el(
        'div',
        { clase: 'browser__url' },
        icono('navegador', 14),
        el('span', { texto: 'yzakkart://blog' }),
      ),
      el('span', { clase: 'browser__badge', texto: 'seguro' }),
    );

    const marco = el('div', { clase: 'browser__view' });
    contenedor.append(barra, marco);

    this.blog = new BlogApp(marco, () => this.cerrarVentana?.());
    this.blog.montar();
    void this.ctx;
  }

  override desmontar(): void {
    this.blog?.desmontar();
    this.blog = null;
    super.desmontar();
  }
}
