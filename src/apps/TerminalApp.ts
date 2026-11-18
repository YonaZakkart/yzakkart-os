import { AppBase } from '../os/App';
import type { ContextoOS } from '../os/contexto';
import { el } from '../os/dom';
import { api } from '../services/api';
import { parsear } from './terminal/CommandParser';
import { COMANDOS, type ContextoTerminal } from './terminal/commands';

/** Consola de YZakkartOS: parser, catálogo de comandos y salida. */
export class TerminalApp extends AppBase {
  readonly id = 'terminal';
  readonly titulo = 'Terminal';
  readonly icono = 'terminal';

  private salida!: HTMLElement;
  private entrada!: HTMLInputElement;
  private prompt!: HTMLElement;
  private historial: string[] = [];
  private indiceHistorial = -1;
  private animando = false;
  private temporizadores = new Set<number>();

  constructor(private ctx: ContextoOS) {
    super();
  }

  protected construir(contenedor: HTMLElement): void {
    this.salida = el('div', {
      clase: 'term__salida',
      attrs: { role: 'log', 'aria-live': 'polite', 'aria-label': 'Salida de la terminal' },
    });

    this.prompt = el('span', { clase: 'term__prompt' });
    this.entrada = el('input', {
      clase: 'term__input',
      attrs: {
        type: 'text',
        'aria-label': 'Comando',
        autocomplete: 'off',
        autocapitalize: 'off',
        spellcheck: 'false',
        placeholder: 'escribe "help"',
      },
    });

    const linea = el('div', { clase: 'term__linea' }, this.prompt, this.entrada);

    contenedor.append(
      el(
        'div',
        { clase: 'term' },
        this.salida,
        linea,
        el('div', { clase: 'term__scan', attrs: { 'aria-hidden': 'true' } }),
      ),
    );

    this.actualizarPrompt();

    this.al(this.entrada, 'keydown', this.alPulsar as EventListener);
    this.al(contenedor, 'pointerdown', (evento) => {
      const objetivo = evento.target as HTMLElement;
      if (!objetivo.closest('input, button, a')) {
        this.entrada.focus();
      }
    });

    this.escribirLinea('YZakkartOS Terminal 1.0', 'term__titulo');
    this.escribirLinea('Escribe "help" para ver los comandos.', 'term__tenue');
    this.escribirLinea('');

    window.setTimeout(() => this.entrada.focus(), 60);
  }

  override desmontar(): void {
    for (const id of this.temporizadores) window.clearTimeout(id);
    this.temporizadores.clear();
    super.desmontar();
  }

  private actualizarPrompt(): void {
    this.prompt.textContent = `${this.ctx.usuario()}@yzakkart:~$`;
  }

  private alPulsar = (evento: KeyboardEvent): void => {
    if (evento.key === 'Enter') {
      evento.preventDefault();
      const linea = this.entrada.value;
      this.entrada.value = '';
      void this.ejecutar(linea);
      return;
    }

    if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      this.navegarHistorial(1);
      return;
    }

    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      this.navegarHistorial(-1);
      return;
    }

    if (evento.key === 'l' && evento.ctrlKey) {
      evento.preventDefault();
      this.salida.replaceChildren();
    }
  };

  private navegarHistorial(direccion: number): void {
    if (this.historial.length === 0) return;

    this.indiceHistorial = Math.min(
      Math.max(this.indiceHistorial + direccion, -1),
      this.historial.length - 1,
    );

    this.entrada.value =
      this.indiceHistorial === -1 ? '' : (this.historial[this.indiceHistorial] ?? '');
    const fin = this.entrada.value.length;
    this.entrada.setSelectionRange(fin, fin);
  }

  private async ejecutar(linea: string): Promise<void> {
    if (this.animando) return;

    const comando = parsear(linea);
    this.escribirLinea(`${this.prompt.textContent} ${linea}`, 'term__eco');

    if (!comando) return;

    if (this.historial[0] !== linea) this.historial.unshift(linea);
    this.indiceHistorial = -1;

    const definicion = COMANDOS[comando.nombre];
    if (!definicion) {
      this.escribirLinea(`orden no encontrada: ${comando.nombre}. Escribe "help".`, 'term__error');
      return;
    }

    const contexto = this.contexto();
    this.animando = true;
    this.entrada.disabled = true;

    try {
      await definicion.ejecutar(comando.args, contexto);
    } catch {
      this.escribirLinea('Algo falló al ejecutar el comando.', 'term__error');
    } finally {
      this.animando = false;
      this.entrada.disabled = false;
      this.actualizarPrompt();
      this.entrada.focus();
    }
  }

  private contexto(): ContextoTerminal {
    return {
      escribir: (texto, clase) => this.escribir(texto, clase),
      escribirLinea: (texto, clase) => this.escribirLinea(texto ?? '', clase),
      limpiar: () => this.salida.replaceChildren(),
      usuario: () => this.ctx.usuario(),
      abrirBlog: () => this.ctx.abrirApp('navegador'),
      apagar: () => this.ctx.apagar(),
      fondos: () => this.ctx.fondos(),
      cambiarFondo: (id) => {
        const existe = this.ctx.fondos().some((fondo) => fondo.id === id);
        if (!existe) return false;
        this.ctx.cambiarFondo(id);
        return true;
      },
      estadisticas: async () => (await api.estadisticas()).stats,
      esperar: (ms) =>
        new Promise((resolver) => {
          const id = window.setTimeout(() => {
            this.temporizadores.delete(id);
            resolver();
          }, ms);
          this.temporizadores.add(id);
        }),
      glitch: (duracion) => this.glitch(duracion),
      detenerAnimacion: () => {
        for (const id of this.temporizadores) window.clearTimeout(id);
        this.temporizadores.clear();
      },
    };
  }

  private glitch(duracion: number): Promise<void> {
    this.salida.classList.add('term__salida--glitch');
    return new Promise((resolver) => {
      const id = window.setTimeout(() => {
        this.salida.classList.remove('term__salida--glitch');
        this.temporizadores.delete(id);
        resolver();
      }, duracion);
      this.temporizadores.add(id);
    });
  }

  private escribir(texto: string, clase?: string): void {
    const nodo = el('span', { texto });
    if (clase) nodo.className = clase;
    this.salida.append(nodo);
    this.alFinal();
  }

  private escribirLinea(texto: string, clase?: string): void {
    const linea = el('div', { clase: `term__fila ${clase ?? ''}`.trim() });
    linea.textContent = texto;
    this.salida.append(linea);
    this.alFinal();
  }

  private alFinal(): void {
    this.salida.scrollTop = this.salida.scrollHeight;
  }
}
