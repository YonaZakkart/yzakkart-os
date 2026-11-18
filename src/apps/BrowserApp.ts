import { AppBase } from '../os/App';
import type { ContextoOS } from '../os/contexto';
import { el } from '../os/dom';

/** Marcador temporal: la rama de blog lo sustituye por YZakkart-Blog. */
export class BrowserApp extends AppBase {
  readonly id = 'navegador';
  readonly titulo = 'Navegador';
  readonly icono = 'navegador';

  constructor(private ctx: ContextoOS) {
    super();
  }

  protected construir(contenedor: HTMLElement): void {
    contenedor.append(el('div', { clase: 'placeholder' }, el('h1', { texto: 'YZakkart-Blog' })));
    void this.ctx;
  }
}
