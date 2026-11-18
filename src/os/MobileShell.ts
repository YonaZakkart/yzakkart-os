import type { App } from './App';
import type { ContextoOS } from './contexto';
import { el, icono } from './dom';
import { APPS, definicionDe } from './registro';
import { FONDOS, type Fondo, fondoGuardado, guardarFondo } from './wallpapers';

/**
 * YZakkart Mobile: cuadrícula de inicio y aplicaciones a pantalla completa.
 * Mismo sistema, otra presentación; sin ventanas flotantes.
 */
export class MobileShell {
  private raiz: HTMLElement;
  private inicio!: HTMLElement;
  private capaApp!: HTMLElement;
  private reloj!: HTMLElement;
  private appAbierta: App | null = null;
  private temporizadorReloj = 0;
  private fondo: Fondo;

  constructor(
    private contenedor: HTMLElement,
    private alApagar: () => void,
    private usuario: () => string,
  ) {
    this.fondo = fondoGuardado();
    this.raiz = el('section', { clase: 'mobile' });
  }

  montar(): void {
    const fondo = el('div', { clase: 'mobile__fondo', attrs: { 'aria-hidden': 'true' } });
    fondo.style.backgroundImage = `url("${this.fondo.archivo}")`;

    this.reloj = el('p', { clase: 'mobile__reloj' });

    this.inicio = el(
      'div',
      { clase: 'mobile__inicio' },
      el(
        'div',
        { clase: 'mobile__cabecera' },
        this.reloj,
        el('p', { clase: 'mobile__marca', texto: 'YZakkart Mobile' }),
      ),
      el(
        'div',
        { clase: 'mobile__grid' },
        ...APPS.map((app) => this.icono(app.id, app.titulo, app.icono)),
      ),
      el('div', { clase: 'mobile__pie' }, this.botonApagar()),
    );

    this.capaApp = el('div', { clase: 'mobile__app', attrs: { hidden: 'true' } });

    this.raiz.append(fondo, this.inicio, this.capaApp);
    this.contenedor.append(this.raiz);

    this.actualizarReloj();
    this.temporizadorReloj = window.setInterval(() => this.actualizarReloj(), 30_000);

    /* El botón atrás del navegador vuelve al inicio en vez de salir. */
    history.replaceState({ yzakkart: 'inicio' }, '');
    window.addEventListener('popstate', this.alAtras);
  }

  desmontar(): void {
    window.clearInterval(this.temporizadorReloj);
    window.removeEventListener('popstate', this.alAtras);
    this.cerrarApp();
    this.raiz.remove();
  }

  abrirApp(id: string): void {
    const definicion = definicionDe(id);
    if (!definicion) return;

    this.cerrarApp();

    const contexto: ContextoOS = {
      abrirApp: (otroId) => this.abrirApp(otroId),
      apagar: () => this.alApagar(),
      cambiarFondo: (fondoId) => this.cambiarFondo(fondoId),
      fondos: () => FONDOS,
      fondoActual: () => this.fondo.id,
      usuario: () => this.usuario(),
    };

    const app = definicion.crear(contexto);
    const cuerpo = el('div', { clase: 'mobile__cuerpo' });
    const marco = el('div', { clase: 'mobile__marco' });
    cuerpo.append(marco);

    const volver = el(
      'button',
      { clase: 'mobile__volver', attrs: { type: 'button', 'aria-label': 'Volver al inicio' } },
      icono('inicio', 18),
      el('span', { texto: 'Inicio' }),
    );
    volver.addEventListener('click', () => this.cerrarApp());

    this.capaApp.replaceChildren(
      el(
        'div',
        { clase: 'mobile__barra' },
        volver,
        el('span', { clase: 'mobile__titulo', texto: definicion.titulo }),
      ),
      cuerpo,
    );
    this.capaApp.hidden = false;
    this.inicio.hidden = true;

    app.montar(marco, () => this.cerrarApp());
    this.appAbierta = app;

    history.pushState({ yzakkart: 'app', id }, '');
  }

  private cerrarApp(): void {
    if (!this.appAbierta) return;
    this.appAbierta.desmontar();
    this.appAbierta = null;
    this.capaApp.replaceChildren();
    this.capaApp.hidden = true;
    this.inicio.hidden = false;
  }

  private alAtras = (): void => {
    if (this.appAbierta) {
      this.cerrarApp();
    } else {
      this.alApagar();
    }
  };

  private icono(id: string, titulo: string, nombreIcono: string): HTMLElement {
    const boton = el(
      'button',
      { clase: 'mobile__icono', attrs: { type: 'button', 'aria-label': `Abrir ${titulo}` } },
      el('span', { clase: 'mobile__icono-art' }, icono(nombreIcono, 30)),
      el('span', { clase: 'mobile__icono-label', texto: titulo }),
    );
    boton.addEventListener('click', () => this.abrirApp(id));
    return boton;
  }

  private botonApagar(): HTMLElement {
    const boton = el(
      'button',
      { clase: 'mobile__apagar', attrs: { type: 'button' } },
      icono('apagar', 18),
      el('span', { texto: 'Apagar' }),
    );
    boton.addEventListener('click', () => this.alApagar());
    return boton;
  }

  private cambiarFondo(id: string): void {
    const nuevo = guardarFondo(id);
    if (!nuevo) return;
    this.fondo = nuevo;
    const capa = this.raiz.querySelector<HTMLElement>('.mobile__fondo');
    if (capa) capa.style.backgroundImage = `url("${nuevo.archivo}")`;
  }

  private actualizarReloj(): void {
    const ahora = new Date();
    this.reloj.textContent = ahora.toLocaleTimeString('es', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
