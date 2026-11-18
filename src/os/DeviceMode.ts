/** Decide la presentación por ancho de pantalla, nunca por user-agent. */
export type Modo = 'escritorio' | 'movil';

const CONSULTA = '(min-width: 768px)';

export class DeviceMode {
  private consulta = window.matchMedia(CONSULTA);
  private escuchas = new Set<(modo: Modo) => void>();

  constructor() {
    this.consulta.addEventListener('change', this.alCambiar);
    this.aplicar();
  }

  get modo(): Modo {
    return this.consulta.matches ? 'escritorio' : 'movil';
  }

  get esEscritorio(): boolean {
    return this.consulta.matches;
  }

  alCambiarModo(escucha: (modo: Modo) => void): () => void {
    this.escuchas.add(escucha);
    return () => this.escuchas.delete(escucha);
  }

  private aplicar(): void {
    document.documentElement.dataset.mode = this.modo;
  }

  private alCambiar = (): void => {
    this.aplicar();
    for (const escucha of this.escuchas) escucha(this.modo);
  };
}
