import type { App } from './App';
import { el, icono } from './dom';

/**
 * Marco de ventana: arrastre, foco, minimizar, maximizar y cierre.
 * Toda la baja de listeners vive en `desmontar`.
 */
export class AppWindow {
  readonly raiz: HTMLElement;
  readonly app: App;
  private cuerpo: HTMLElement;
  private barra: HTMLElement;
  private minimizada = false;
  private maximizada = false;
  private rectPrevio = { x: 0, y: 0, ancho: 0, alto: 0 };

  constructor(
    app: App,
    private alPedirFoco: () => void,
    private alPedirCierre: () => void,
  ) {
    this.app = app;

    this.barra = el(
      'header',
      { clase: 'window__bar' },
      el('span', { clase: 'window__icon' }, icono(app.icono, 16)),
      el('h2', { clase: 'window__title', texto: app.titulo }),
      el(
        'div',
        { clase: 'window__actions' },
        el(
          'button',
          {
            clase: 'window__btn',
            attrs: { type: 'button', 'aria-label': 'Minimizar', title: 'Minimizar' },
          },
          icono('minimizar', 16),
        ),
        el(
          'button',
          {
            clase: 'window__btn window__btn--close',
            attrs: { type: 'button', 'aria-label': 'Cerrar', title: 'Cerrar' },
          },
          icono('cerrar', 16),
        ),
      ),
    );

    this.cuerpo = el('div', { clase: 'window__body' });

    this.raiz = el(
      'section',
      {
        clase: 'window',
        attrs: {
          role: 'dialog',
          'aria-label': app.titulo,
          'aria-modal': 'false',
        },
      },
      this.barra,
      this.cuerpo,
    );

    this.raiz.addEventListener('pointerdown', () => this.alPedirFoco());

    const [minimizar, cerrar] = Array.from(
      this.barra.querySelectorAll<HTMLButtonElement>('.window__btn'),
    );
    minimizar.addEventListener('click', () => this.minimizar());
    cerrar.addEventListener('click', () => this.alPedirCierre());

    this.barra.addEventListener('dblclick', (evento) => {
      if ((evento.target as HTMLElement).closest('.window__btn')) return;
      this.alternarMaximizar();
    });

    this.barra.addEventListener('pointerdown', this.iniciarArrastre);
    this.barra.addEventListener('keydown', this.moverConTeclado);
  }

  montar(): void {
    this.app.montar(this.cuerpo);
  }

  desmontar(): void {
    this.app.desmontar();
    this.raiz.remove();
  }

  get estaMinimizada(): boolean {
    return this.minimizada;
  }

  enfocar(zIndex: number): void {
    this.raiz.style.zIndex = String(zIndex);
    this.raiz.classList.add('window--activa');
  }

  desenfocar(): void {
    this.raiz.classList.remove('window--activa');
  }

  minimizar(): void {
    this.minimizada = true;
    this.raiz.classList.add('window--minimizada');
  }

  restaurar(): void {
    this.minimizada = false;
    this.raiz.classList.remove('window--minimizada');
  }

  alternarMaximizar(): void {
    if (this.maximizada) {
      this.maximizada = false;
      this.raiz.classList.remove('window--maximizada');
      Object.assign(this.raiz.style, {
        left: `${this.rectPrevio.x}px`,
        top: `${this.rectPrevio.y}px`,
        width: `${this.rectPrevio.ancho}px`,
        height: `${this.rectPrevio.alto}px`,
      });
      return;
    }

    const rect = this.raiz.getBoundingClientRect();
    this.rectPrevio = { x: rect.left, y: rect.top, ancho: rect.width, alto: rect.height };
    this.maximizada = true;
    this.raiz.classList.add('window--maximizada');
    this.raiz.style.left = '0px';
    this.raiz.style.top = '0px';
    this.raiz.style.width = '100%';
    this.raiz.style.height = 'calc(100% - 56px)';
  }

  /** Coloca la ventana centrada con un desplazamiento escalonado. */
  posicionar(indice: number): void {
    const ancho = Math.min(Math.max(window.innerWidth * 0.78, 420), 1040);
    const alto = Math.min(Math.max(window.innerHeight * 0.72, 340), 720);
    const x = Math.max(16, (window.innerWidth - ancho) / 2 + indice * 26);
    const y = Math.max(16, (window.innerHeight - alto) / 2 - 20 + indice * 22);

    Object.assign(this.raiz.style, {
      left: `${x}px`,
      top: `${y}px`,
      width: `${ancho}px`,
      height: `${alto}px`,
    });
  }

  private iniciarArrastre = (evento: PointerEvent): void => {
    if ((evento.target as HTMLElement).closest('.window__btn')) return;
    if (this.maximizada) return;
    if (evento.button !== 0) return;

    const rect = this.raiz.getBoundingClientRect();
    const desfaseX = evento.clientX - rect.left;
    const desfaseY = evento.clientY - rect.top;
    const barra = this.barra;

    barra.setPointerCapture(evento.pointerId);
    this.raiz.classList.add('window--arrastrando');

    const mover = (movimiento: PointerEvent): void => {
      const x = Math.min(
        Math.max(movimiento.clientX - desfaseX, -rect.width + 120),
        window.innerWidth - 120,
      );
      const y = Math.min(Math.max(movimiento.clientY - desfaseY, 0), window.innerHeight - 90);
      this.raiz.style.left = `${x}px`;
      this.raiz.style.top = `${y}px`;
    };

    const soltar = (): void => {
      this.raiz.classList.remove('window--arrastrando');
      barra.removeEventListener('pointermove', mover);
      barra.removeEventListener('pointerup', soltar);
      barra.removeEventListener('pointercancel', soltar);
    };

    barra.addEventListener('pointermove', mover);
    barra.addEventListener('pointerup', soltar);
    barra.addEventListener('pointercancel', soltar);
  };

  private moverConTeclado = (evento: KeyboardEvent): void => {
    const paso = evento.shiftKey ? 40 : 12;
    const rect = this.raiz.getBoundingClientRect();
    let x = rect.left;
    let y = rect.top;

    switch (evento.key) {
      case 'ArrowLeft':
        x -= paso;
        break;
      case 'ArrowRight':
        x += paso;
        break;
      case 'ArrowUp':
        y -= paso;
        break;
      case 'ArrowDown':
        y += paso;
        break;
      case 'Escape':
        this.alPedirCierre();
        return;
      default:
        return;
    }

    evento.preventDefault();
    this.raiz.style.left = `${Math.max(0, x)}px`;
    this.raiz.style.top = `${Math.max(0, y)}px`;
  };
}
