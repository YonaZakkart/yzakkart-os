import type { App } from './App';
import { AppWindow } from './AppWindow';

/** Registro, foco y z-index de las ventanas. Una instancia por app. */
export class WindowManager {
  private ventanas = new Map<string, AppWindow>();
  private orden: string[] = [];
  private contadorZ = 100;

  constructor(
    private capa: HTMLElement,
    private alCambiar: () => void,
  ) {}

  get abiertas(): { id: string; titulo: string; minimizada: boolean }[] {
    return this.orden
      .map((id) => this.ventanas.get(id))
      .filter((v): v is AppWindow => Boolean(v))
      .map((v) => ({ id: v.app.id, titulo: v.app.titulo, minimizada: v.estaMinimizada }));
  }

  abrir(app: App): void {
    const existente = this.ventanas.get(app.id);
    if (existente) {
      existente.restaurar();
      this.enfocar(app.id);
      this.alCambiar();
      return;
    }

    const ventana = new AppWindow(
      app,
      () => this.enfocar(app.id),
      () => this.cerrar(app.id),
    );

    this.ventanas.set(app.id, ventana);
    this.orden.push(app.id);
    this.capa.append(ventana.raiz);
    ventana.posicionar(this.orden.length - 1);
    ventana.montar();
    this.enfocar(app.id);
    this.alCambiar();
  }

  cerrar(id: string): void {
    const ventana = this.ventanas.get(id);
    if (!ventana) return;
    ventana.desmontar();
    this.ventanas.delete(id);
    this.orden = this.orden.filter((x) => x !== id);
    this.alCambiar();
  }

  alternar(id: string): void {
    const ventana = this.ventanas.get(id);
    if (!ventana) return;
    if (ventana.estaMinimizada) {
      ventana.restaurar();
      this.enfocar(id);
    } else if (this.orden[this.orden.length - 1] === id) {
      ventana.minimizar();
    } else {
      this.enfocar(id);
    }
    this.alCambiar();
  }

  enfocar(id: string): void {
    const ventana = this.ventanas.get(id);
    if (!ventana) return;

    this.contadorZ += 1;
    for (const [otroId, otra] of this.ventanas) {
      if (otroId !== id) otra.desenfocar();
    }
    ventana.enfocar(this.contadorZ);

    this.orden = [...this.orden.filter((x) => x !== id), id];
    this.alCambiar();
  }

  cerrarTodas(): void {
    for (const id of [...this.ventanas.keys()]) this.cerrar(id);
  }
}
