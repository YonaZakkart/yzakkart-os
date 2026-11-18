import { el } from './dom';

/**
 * La mesa: una PC apagada esperando que alguien la encienda.
 * El zoom de encendido se calcula sobre el rectángulo real de la pantalla.
 */
export class DeskScene {
  private raiz: HTMLElement;
  private pantalla!: HTMLElement;
  private encendiendo = false;

  constructor(
    private contenedor: HTMLElement,
    private alEncender: () => void,
  ) {
    this.raiz = el('section', {
      clase: 'desk',
      attrs: { 'aria-label': 'Mesa con una computadora apagada' },
    });
  }

  montar(): void {
    const teclado = el('div', { clase: 'keyboard', attrs: { 'aria-hidden': 'true' } });
    for (let fila = 0; fila < 3; fila++) {
      const filaEl = el('div', { clase: 'keyboard__row' });
      for (let tecla = 0; tecla < (fila === 2 ? 6 : 10); tecla++) {
        filaEl.append(el('span', { clase: 'keyboard__key' }));
      }
      teclado.append(filaEl);
    }

    this.pantalla = el(
      'div',
      { clase: 'monitor__screen' },
      el('div', { clase: 'monitor__reflection', attrs: { 'aria-hidden': 'true' } }),
      el(
        'div',
        { clase: 'monitor__off' },
        el('img', { clase: 'monitor__logo', attrs: { src: '/favicon.svg', alt: '' } }),
        el('p', { clase: 'monitor__brand', texto: 'YZakkartOS' }),
        el('p', { clase: 'monitor__hint', texto: 'Haz clic para encender' }),
      ),
    );

    const monitor = el(
      'div',
      {
        clase: 'monitor',
        attrs: {
          role: 'button',
          tabindex: '0',
          'aria-label': 'Encender la computadora',
        },
      },
      el('div', { clase: 'monitor__bezel' }, this.pantalla),
      el(
        'div',
        { clase: 'monitor__chin' },
        el('span', { clase: 'monitor__led' }),
        el('span', { clase: 'monitor__chin-text', texto: 'YZ' }),
      ),
      el('div', { clase: 'monitor__neck' }),
      el('div', { clase: 'monitor__foot' }),
    );

    const torre = el(
      'div',
      { clase: 'tower', attrs: { 'aria-hidden': 'true' } },
      el('span', { clase: 'tower__slot' }),
      el('span', { clase: 'tower__ring' }),
      el('span', { clase: 'tower__led' }),
    );

    const setup = el(
      'div',
      { clase: 'desk__setup' },
      el(
        'div',
        { clase: 'desk__center' },
        monitor,
        el('div', { clase: 'peripherals' }, teclado, el('div', { clase: 'mouse' })),
      ),
      torre,
    );

    this.raiz.append(
      el('div', { clase: 'desk__grid', attrs: { 'aria-hidden': 'true' } }),
      el('div', { clase: 'desk__glow', attrs: { 'aria-hidden': 'true' } }),
      el('div', { clase: 'desk__surface', attrs: { 'aria-hidden': 'true' } }),
      setup,
      el('p', {
        clase: 'desk__caption',
        texto: 'La computadora está apagada.',
      }),
    );

    monitor.addEventListener('click', () => this.encender());
    monitor.addEventListener('keydown', (evento) => {
      if (evento.key === 'Enter' || evento.key === ' ') {
        evento.preventDefault();
        this.encender();
      }
    });

    this.contenedor.append(this.raiz);
  }

  desmontar(): void {
    this.raiz.remove();
  }

  private encender(): void {
    if (this.encendiendo) return;
    this.encendiendo = true;

    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const rect = this.pantalla.getBoundingClientRect();

    this.raiz.classList.add('desk--powering');
    this.pantalla.classList.add('monitor__screen--zoom');

    if (!reducido) {
      const escala = Math.max(window.innerWidth / rect.width, window.innerHeight / rect.height);
      const dx = window.innerWidth / 2 - (rect.left + rect.width / 2);
      const dy = window.innerHeight / 2 - (rect.top + rect.height / 2);
      this.pantalla.style.transform = `translate(${dx}px, ${dy}px) scale(${escala})`;
    }

    window.setTimeout(
      () => {
        this.desmontar();
        this.alEncender();
      },
      reducido ? 160 : 620,
    );
  }
}
