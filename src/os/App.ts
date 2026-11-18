export interface App {
  readonly id: string;
  readonly titulo: string;
  readonly icono: string;
  /** `cerrar` permite que la app cierre su propia ventana (botón [X]). */
  montar(contenedor: HTMLElement, cerrar?: () => void): void;
  desmontar(): void;
}

/** Base común: entrega un contenedor limpio y obliga a limpiar al cerrar. */
export abstract class AppBase implements App {
  abstract readonly id: string;
  abstract readonly titulo: string;
  abstract readonly icono: string;

  protected raiz: HTMLElement | null = null;
  protected cerrarVentana: (() => void) | null = null;
  private liberadores: (() => void)[] = [];

  montar(contenedor: HTMLElement, cerrar?: () => void): void {
    this.raiz = contenedor;
    this.cerrarVentana = cerrar ?? null;
    contenedor.classList.add('app', `app--${this.id}`);
    this.construir(contenedor);
  }

  desmontar(): void {
    for (const liberar of this.liberadores) liberar();
    this.liberadores = [];
    if (this.raiz) {
      this.raiz.replaceChildren();
      this.raiz.classList.remove('app', `app--${this.id}`);
      this.raiz = null;
    }
  }

  /** Registra un listener y lo da de baja al desmontar. */
  protected al(
    elemento: EventTarget,
    evento: string,
    fn: EventListener,
    opciones?: AddEventListenerOptions,
  ): void {
    elemento.addEventListener(evento, fn, opciones);
    this.liberadores.push(() => elemento.removeEventListener(evento, fn, opciones));
  }

  protected abstract construir(contenedor: HTMLElement): void;
}
