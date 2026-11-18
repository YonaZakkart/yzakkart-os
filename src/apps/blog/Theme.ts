export type Tema = 'light' | 'dark';

const CLAVE = 'yzakkart.theme';

/** Tema claro/oscuro del blog, independiente del escritorio. */
export class Theme {
  private valor: Tema;

  constructor() {
    const guardado = localStorage.getItem(CLAVE);
    if (guardado === 'light' || guardado === 'dark') {
      this.valor = guardado;
    } else {
      const prefiereOscuro = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.valor = prefiereOscuro ? 'dark' : 'light';
    }
  }

  get actual(): Tema {
    return this.valor;
  }

  aplicar(raiz: HTMLElement): void {
    raiz.dataset.theme = this.valor;
  }

  alternar(raiz: HTMLElement): Tema {
    this.valor = this.valor === 'light' ? 'dark' : 'light';
    this.aplicar(raiz);
    try {
      localStorage.setItem(CLAVE, this.valor);
    } catch {
      /* almacenamiento bloqueado */
    }
    return this.valor;
  }
}
