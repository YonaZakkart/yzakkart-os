import type { App } from './App';
import { WindowManager } from './WindowManager';
import type { ContextoOS } from './contexto';
import { el, icono } from './dom';
import { APPS, definicionDe } from './registro';
import { FONDOS, type Fondo, fondoGuardado, guardarFondo } from './wallpapers';

/**
 * Escritorio de YZakkartOS: fondo, íconos, barra de tareas, menú de inicio,
 * menú contextual y gestor de ventanas.
 */
export class OSShell {
  private raiz: HTMLElement;
  private capaVentanas!: HTMLElement;
  private menuInicio!: HTMLElement;
  private menuContexto!: HTMLElement;
  private reloj!: HTMLElement;
  private listaTareas!: HTMLElement;
  private manager!: WindowManager;
  private temporizadorReloj = 0;
  private fondo: Fondo;

  constructor(
    private contenedor: HTMLElement,
    private alApagar: () => void,
    private usuario: () => string,
  ) {
    this.fondo = fondoGuardado();
    this.raiz = el('section', { clase: 'os' });
  }

  montar(): void {
    const fondo = el('div', { clase: 'os__wallpaper', attrs: { 'aria-hidden': 'true' } });
    fondo.style.backgroundImage = `url("${this.fondo.archivo}")`;

    const iconos = el('div', { clase: 'os__icons' });
    for (const app of APPS) {
      iconos.append(this.crearIcono(app.id, app.titulo, app.icono));
    }

    this.capaVentanas = el('div', { clase: 'os__windows' });

    this.manager = new WindowManager(this.capaVentanas, () => this.actualizarTareas());

    this.reloj = el('span', { clase: 'taskbar__clock', attrs: { 'aria-live': 'off' } });
    this.listaTareas = el('div', { clase: 'taskbar__apps' });

    const botonInicio = el(
      'button',
      {
        clase: 'taskbar__start',
        attrs: { type: 'button', 'aria-label': 'Menú de inicio', 'aria-expanded': 'false' },
      },
      icono('inicio', 20),
    );
    botonInicio.addEventListener('click', (evento) => {
      evento.stopPropagation();
      this.alternarMenuInicio();
    });

    const barra = el(
      'footer',
      { clase: 'taskbar', attrs: { role: 'toolbar', 'aria-label': 'Barra de tareas' } },
      botonInicio,
      this.listaTareas,
      el('div', { clase: 'taskbar__tray' }, this.reloj),
    );

    this.menuInicio = this.crearMenuInicio();
    this.menuContexto = this.crearMenuContexto();

    this.raiz.append(fondo, iconos, this.capaVentanas, barra, this.menuInicio, this.menuContexto);
    this.contenedor.append(this.raiz);

    this.raiz.addEventListener('contextmenu', (evento) => {
      evento.preventDefault();
      this.abrirMenuContexto(evento.clientX, evento.clientY);
    });

    this.raiz.addEventListener('pointerdown', (evento) => {
      const objetivo = evento.target as HTMLElement;
      if (!objetivo.closest('.startmenu')) this.cerrarMenuInicio();
      if (!objetivo.closest('.contextmenu')) this.cerrarMenuContexto();
    });

    this.raiz.addEventListener('keydown', (evento) => {
      if (evento.key === 'Escape') {
        this.cerrarMenuInicio();
        this.cerrarMenuContexto();
      }
    });

    this.actualizarReloj();
    this.temporizadorReloj = window.setInterval(() => this.actualizarReloj(), 30_000);
  }

  desmontar(): void {
    window.clearInterval(this.temporizadorReloj);
    this.manager?.cerrarTodas();
    this.raiz.remove();
  }

  abrirApp(id: string): void {
    const definicion = definicionDe(id);
    if (!definicion) return;

    const contexto: ContextoOS = {
      abrirApp: (otroId) => this.abrirApp(otroId),
      apagar: () => this.alApagar(),
      cambiarFondo: (fondoId) => this.cambiarFondo(fondoId),
      fondos: () => FONDOS,
      fondoActual: () => this.fondo.id,
      usuario: () => this.usuario(),
    };

    const app: App = definicion.crear(contexto);
    this.manager.abrir(app);
    this.cerrarMenuInicio();
  }

  cambiarFondo(id: string): void {
    const nuevo = guardarFondo(id);
    if (!nuevo) return;
    this.fondo = nuevo;
    const capa = this.raiz.querySelector<HTMLElement>('.os__wallpaper');
    if (capa) capa.style.backgroundImage = `url("${nuevo.archivo}")`;
    this.cerrarMenuContexto();
  }

  private crearIcono(id: string, titulo: string, nombreIcono: string): HTMLElement {
    const boton = el(
      'button',
      {
        clase: 'os-icon',
        attrs: { type: 'button', 'data-app': id, 'aria-label': `Abrir ${titulo}` },
      },
      el('span', { clase: 'os-icon__art' }, icono(nombreIcono, 34)),
      el('span', { clase: 'os-icon__label', texto: titulo }),
    );

    boton.addEventListener('click', () => this.abrirApp(id));
    return boton;
  }

  private crearMenuInicio(): HTMLElement {
    const menu = el(
      'div',
      {
        clase: 'startmenu',
        attrs: { role: 'menu', 'aria-label': 'Menú de inicio', hidden: 'true' },
      },
      el('p', { clase: 'startmenu__user', texto: this.usuario() }),
    );

    for (const app of APPS) {
      const item = el(
        'button',
        { clase: 'startmenu__item', attrs: { type: 'button', role: 'menuitem' } },
        icono(app.icono, 18),
        el('span', { texto: app.titulo }),
      );
      item.addEventListener('click', () => this.abrirApp(app.id));
      menu.append(item);
    }

    const apagar = el(
      'button',
      {
        clase: 'startmenu__item startmenu__item--danger',
        attrs: { type: 'button', role: 'menuitem' },
      },
      icono('apagar', 18),
      el('span', { texto: 'Apagar' }),
    );
    apagar.addEventListener('click', () => this.alApagar());

    menu.append(el('div', { clase: 'startmenu__sep' }), apagar);
    return menu;
  }

  private crearMenuContexto(): HTMLElement {
    const menu = el('div', {
      clase: 'contextmenu',
      attrs: { role: 'menu', 'aria-label': 'Menú del escritorio', hidden: 'true' },
    });

    menu.append(el('p', { clase: 'contextmenu__title', texto: 'Fondo de pantalla' }));

    for (const fondo of FONDOS) {
      const item = el(
        'button',
        {
          clase: 'contextmenu__item',
          attrs: { type: 'button', role: 'menuitem', 'data-fondo': fondo.id },
        },
        el('span', { clase: 'contextmenu__dot' }),
        el('span', { texto: fondo.nombre }),
      );
      item.addEventListener('click', () => this.cambiarFondo(fondo.id));
      menu.append(item);
    }

    const terminal = el(
      'button',
      { clase: 'contextmenu__item', attrs: { type: 'button', role: 'menuitem' } },
      el('span', { clase: 'contextmenu__dot contextmenu__dot--alt' }),
      el('span', { texto: 'Abrir terminal' }),
    );
    terminal.addEventListener('click', () => {
      this.cerrarMenuContexto();
      this.abrirApp('terminal');
    });

    menu.append(el('div', { clase: 'contextmenu__sep' }), terminal);
    return menu;
  }

  private abrirMenuContexto(x: number, y: number): void {
    this.cerrarMenuInicio();
    this.menuContexto.hidden = false;
    const ancho = 220;
    const alto = 230;
    this.menuContexto.style.left = `${Math.min(x, window.innerWidth - ancho - 8)}px`;
    this.menuContexto.style.top = `${Math.min(y, window.innerHeight - alto - 8)}px`;
  }

  private cerrarMenuContexto(): void {
    this.menuContexto.hidden = true;
  }

  private alternarMenuInicio(): void {
    const abierto = !this.menuInicio.hidden;
    this.menuInicio.hidden = abierto;
    const boton = this.raiz.querySelector<HTMLElement>('.taskbar__start');
    boton?.setAttribute('aria-expanded', String(!abierto));
    this.cerrarMenuContexto();
  }

  private cerrarMenuInicio(): void {
    if (this.menuInicio.hidden) return;
    this.menuInicio.hidden = true;
    const boton = this.raiz.querySelector<HTMLElement>('.taskbar__start');
    boton?.setAttribute('aria-expanded', 'false');
  }

  private actualizarReloj(): void {
    const ahora = new Date();
    const hora = ahora.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    this.reloj.textContent = hora;
    this.reloj.title = ahora.toLocaleDateString('es', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }

  private actualizarTareas(): void {
    this.listaTareas.replaceChildren();

    for (const ventana of this.manager.abiertas) {
      const boton = el(
        'button',
        {
          clase: `taskbar__app ${ventana.minimizada ? 'taskbar__app--min' : ''}`,
          attrs: { type: 'button', title: ventana.titulo },
        },
        el('span', { texto: ventana.titulo }),
      );
      boton.addEventListener('click', () => this.manager.alternar(ventana.id));
      this.listaTareas.append(boton);
    }
  }
}
