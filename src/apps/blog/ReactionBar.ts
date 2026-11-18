import { REACCIONES } from '../../models/types';
import { el } from '../../os/dom';

interface Opciones {
  counts: Record<string, number>;
  mia: string | null;
  alCambiar: (kind: string | null) => Promise<Record<string, number>>;
}

/**
 * Barra de reacciones con actualización optimista y una sola reacción
 * por usuario: pulsar la propia la quita, pulsar otra la reemplaza.
 */
export class ReactionBar {
  readonly raiz: HTMLElement;
  private counts: Record<string, number>;
  private mia: string | null;
  private ocupada = false;
  private botones = new Map<string, HTMLButtonElement>();

  constructor(private opciones: Opciones) {
    this.counts = { ...opciones.counts };
    this.mia = opciones.mia;
    this.raiz = el('div', {
      clase: 'reactions',
      attrs: { role: 'group', 'aria-label': 'Reacciones' },
    });
    this.construir();
  }

  private construir(): void {
    this.raiz.replaceChildren();

    for (const reaccion of REACCIONES) {
      const total = this.counts[reaccion.kind] ?? 0;
      const activa = this.mia === reaccion.kind;

      const boton = el(
        'button',
        {
          clase: `reaction ${activa ? 'reaction--activa' : ''}`,
          attrs: {
            type: 'button',
            'aria-pressed': String(activa),
            'aria-label': `${reaccion.etiqueta}${total > 0 ? `, ${total}` : ''}`,
            title: reaccion.etiqueta,
          },
        },
        el('span', { clase: 'reaction__emoji', texto: reaccion.emoji }),
        total > 0 ? el('span', { clase: 'reaction__total', texto: String(total) }) : null,
      );

      boton.addEventListener('click', () => void this.alPulsar(reaccion.kind));
      this.botones.set(reaccion.kind, boton);
      this.raiz.append(boton);
    }
  }

  actualizar(counts: Record<string, number>, mia: string | null): void {
    this.counts = { ...counts };
    this.mia = mia;
    this.construir();
  }

  private async alPulsar(kind: string): Promise<void> {
    if (this.ocupada) return;
    this.ocupada = true;

    const anterior = { counts: { ...this.counts }, mia: this.mia };
    const quitar = this.mia === kind;

    /* Optimista: se pinta antes de que responda el servidor. */
    const conteos = { ...this.counts };
    if (this.mia) {
      conteos[this.mia] = Math.max(0, (conteos[this.mia] ?? 1) - 1);
      if (conteos[this.mia] === 0) delete conteos[this.mia];
    }
    if (!quitar) {
      conteos[kind] = (conteos[kind] ?? 0) + 1;
    }
    this.actualizar(conteos, quitar ? null : kind);

    try {
      const respuesta = quitar ? null : kind;
      const nuevos = await this.opciones.alCambiar(respuesta);
      this.actualizar(nuevos, respuesta);
    } catch {
      this.actualizar(anterior.counts, anterior.mia);
    } finally {
      this.ocupada = false;
    }
  }
}
