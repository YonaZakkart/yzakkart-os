import { el } from './dom';

const DURACION_ESCRITORIO = 1300;
const DURACION_MOVIL = 1000;

/** Pantalla de arranque breve, con logo y barra de progreso. */
export class BootScreen {
  private raiz: HTMLElement;
  private temporizador = 0;

  constructor(
    private contenedor: HTMLElement,
    private alTerminar: () => void,
    private movil: boolean,
  ) {
    this.raiz = el(
      'section',
      { clase: `boot ${movil ? 'boot--mobile' : ''}`, attrs: { 'aria-live': 'polite' } },
      el(
        'div',
        { clase: 'boot__inner' },
        el('img', { clase: 'boot__logo', attrs: { src: '/favicon.svg', alt: '' } }),
        el('h1', { clase: 'boot__title', texto: movil ? 'YZakkart Mobile' : 'YZakkartOS' }),
        el(
          'div',
          { clase: 'boot__bar', attrs: { role: 'progressbar', 'aria-label': 'Iniciando' } },
          el('span'),
        ),
        el('p', {
          clase: 'boot__status',
          texto: movil ? 'Preparando el teléfono…' : 'Iniciando el sistema…',
        }),
      ),
    );
  }

  montar(): void {
    this.contenedor.append(this.raiz);
    const duracion = this.movil ? DURACION_MOVIL : DURACION_ESCRITORIO;
    this.raiz.style.setProperty('--boot-duration', `${duracion}ms`);
    this.temporizador = window.setTimeout(() => {
      this.desmontar();
      this.alTerminar();
    }, duracion);
  }

  desmontar(): void {
    window.clearTimeout(this.temporizador);
    this.raiz.remove();
  }
}
