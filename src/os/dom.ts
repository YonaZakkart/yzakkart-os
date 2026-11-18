type Hijo = Node | string | null | undefined;

export interface Opciones {
  clase?: string;
  texto?: string;
  attrs?: Record<string, string>;
  estilo?: Partial<CSSStyleDeclaration>;
}

/**
 * Constructor de DOM sin innerHTML: todo texto entra por textContent.
 * Es la única forma permitida de crear elementos en el proyecto.
 */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  opciones: Opciones = {},
  ...hijos: Hijo[]
): HTMLElementTagNameMap[K] {
  const nodo = document.createElement(tag);

  if (opciones.clase) nodo.className = opciones.clase;
  if (opciones.texto !== undefined) nodo.textContent = opciones.texto;
  if (opciones.attrs) {
    for (const [clave, valor] of Object.entries(opciones.attrs)) {
      nodo.setAttribute(clave, valor);
    }
  }
  if (opciones.estilo) Object.assign(nodo.style, opciones.estilo);

  for (const hijo of hijos) {
    if (hijo === null || hijo === undefined) continue;
    nodo.append(typeof hijo === 'string' ? document.createTextNode(hijo) : hijo);
  }

  return nodo;
}

export function icono(nombre: string, tamano = 24): SVGSVGElement {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(tamano));
  svg.setAttribute('height', String(tamano));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.6');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');

  for (const d of TRAZOS[nombre] ?? []) {
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }

  return svg;
}

const TRAZOS: Record<string, string[]> = {
  navegador: [
    'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z',
    'M3.5 9h17M3.5 15h17',
    'M12 3c2.4 2.6 3.6 5.6 3.6 9s-1.2 6.4-3.6 9c-2.4-2.6-3.6-5.6-3.6-9S9.6 5.6 12 3Z',
  ],
  terminal: ['M4 6h16v12H4z', 'M7.5 10l2.5 2.5L7.5 15', 'M13 15h4'],
  apagar: ['M12 4v8', 'M7.8 6.3a8 8 0 1 0 8.4 0'],
  inicio: ['M4 11.5 12 5l8 6.5', 'M6.5 10.5V19h11v-8.5'],
  ajustes: [
    'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
    'M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15a2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.4-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 4a2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.9 1.4l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21 11a2 2 0 1 1 0 4Z',
  ],
  imagen: ['M4 5h16v14H4z', 'M4 16l4.5-4.5 3 3L16 10l4 4', 'M9 9.5h.01'],
  cerrar: ['M6 6l12 12', 'M18 6 6 18'],
  minimizar: ['M6 12h12'],
  sol: [
    'M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M17.7 6.3l-1.4 1.4M7.7 16.3l-1.4 1.4',
    'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z',
  ],
  luna: ['M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z'],
};
