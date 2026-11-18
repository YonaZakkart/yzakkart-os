import { el } from '../../os/dom';

const NS = 'http://www.w3.org/2000/svg';

export interface Marcas {
  badge_gold?: boolean;
  badge_yz?: boolean;
}

function insigniaDorada(): SVGSVGElement {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'insignia insignia--dorada');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Cuenta verificada');

  const circulo = document.createElementNS(NS, 'circle');
  circulo.setAttribute('cx', '12');
  circulo.setAttribute('cy', '12');
  circulo.setAttribute('r', '10');
  circulo.setAttribute('fill', 'currentColor');

  const check = document.createElementNS(NS, 'path');
  check.setAttribute('d', 'M7.4 12.4l3.1 3.1 6.1-6.6');
  check.setAttribute('fill', 'none');
  check.setAttribute('stroke', '#1b1305');
  check.setAttribute('stroke-width', '2.4');
  check.setAttribute('stroke-linecap', 'round');
  check.setAttribute('stroke-linejoin', 'round');

  svg.append(circulo, check);
  return svg;
}

function insigniaYz(): HTMLElement {
  return el(
    'span',
    {
      clase: 'insignia insignia--yz',
      attrs: { title: 'Equipo de YZakkartOS', 'aria-label': 'Equipo de YZakkartOS' },
    },
    el('img', { attrs: { src: '/favicon.svg', alt: '' } }),
  );
}

/** Devuelve las insignias de una cuenta, o `null` si no tiene ninguna. */
export function crearInsignias(marcas: Marcas): HTMLElement | null {
  if (!marcas.badge_gold && !marcas.badge_yz) return null;

  const contenedor = el('span', { clase: 'insignias' });
  if (marcas.badge_gold) contenedor.append(insigniaDorada());
  if (marcas.badge_yz) contenedor.append(insigniaYz());
  return contenedor;
}
