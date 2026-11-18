import { AppBase } from '../os/App';
import type { ContextoOS } from '../os/contexto';
import { el } from '../os/dom';

/** Marcador temporal: la rama de terminal lo sustituye por la consola real. */
export class TerminalApp extends AppBase {
  readonly id = 'terminal';
  readonly titulo = 'Terminal';
  readonly icono = 'terminal';

  constructor(private ctx: ContextoOS) {
    super();
  }

  protected construir(contenedor: HTMLElement): void {
    contenedor.append(el('div', { clase: 'placeholder' }, el('h1', { texto: 'Terminal' })));
    void this.ctx;
  }
}
